'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { AppLayout } from '@/components/layout';
import {
  Card,
  CardContent,
  Button,
  Input,
  Badge,
  Loading,
  Modal,
  Table,
  TableRow,
  TableCell,
  useConfirm,
} from '@/components/ui';
import { useToast } from '@/hooks/useToast';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Users,
  Phone,
  Mail,
  Cake,
  Save
} from 'lucide-react';
import {
  useClientes,
  useCreateCliente,
  useUpdateCliente,
  useDeleteCliente
} from '@/hooks/useQueries';
import { format } from 'date-fns';
import type { Cliente } from '@/types';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { clienteSchema, type ClienteFormData } from '@/lib/validations';

// Constantes calculadas uma vez no carregamento do módulo (fora do render)
const MES_ATUAL = new Date().getMonth();
const CUTOFF_30_DIAS = Date.now() - 30 * 24 * 60 * 60 * 1000;

function contarAniversariantes(clientes: Cliente[]): number {
  return clientes.filter(c => {
    if (!c.dataNascimento) return false;
    return new Date(c.dataNascimento).getMonth() === MES_ATUAL;
  }).length;
}

function contarClientesAtivos(clientes: Cliente[]): number {
  return clientes.filter(c => {
    if (!c.ultimaCompra) return false;
    return new Date(c.ultimaCompra).getTime() >= CUTOFF_30_DIAS;
  }).length;
}

export default function ClientesPage() {
  const { user, loading: authLoading, isAdmin } = useAuth();
  const router = useRouter();
  const { error: showError } = useToast();
  const { confirm: confirmDialog, ConfirmDialog: ConfirmDialogEl } = useConfirm();

  // React Query hooks
  const { data: clientes = [], isLoading: loading } = useClientes();
  const createClienteMutation = useCreateCliente();
  const updateClienteMutation = useUpdateCliente();
  const deleteClienteMutation = useDeleteCliente();

  const [termoBusca, setTermoBusca] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [clienteEditando, setClienteEditando] = useState<Cliente | null>(null);

  // Estatísticas derivadas (funções puras com constantes de módulo)
  const aniversariantesDoMes = contarAniversariantes(clientes);
  const clientesAtivos30Dias = contarClientesAtivos(clientes);

  // React Hook Form
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<z.input<typeof clienteSchema>, unknown, ClienteFormData>({
    resolver: zodResolver(clienteSchema),
    defaultValues: {
      nome: '',
      telefone: '',
      email: '',
      cpf: '',
      dataNascimento: '',
      endereco: '',
      observacoes: '',
    },
  });

  const salvando = createClienteMutation.isPending || updateClienteMutation.isPending;

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  const handleNovoCliente = () => {
    setClienteEditando(null);
    reset({
      nome: '',
      telefone: '',
      email: '',
      cpf: '',
      dataNascimento: '',
      endereco: '',
      observacoes: '',
    });
    setShowModal(true);
  };

  const handleEditarCliente = (cliente: Cliente) => {
    setClienteEditando(cliente);
    reset({
      nome: cliente.nome,
      telefone: cliente.telefone || '',
      email: cliente.email || '',
      cpf: cliente.cpf || '',
      dataNascimento: cliente.dataNascimento ? format(new Date(cliente.dataNascimento), 'yyyy-MM-dd') : '',
      endereco: cliente.endereco || '',
      observacoes: cliente.observacoes || '',
    });
    setShowModal(true);
  };

  const onSubmit = async (data: ClienteFormData) => {
    try {
      const clienteData = {
        nome: data.nome.trim(),
        telefone: data.telefone?.trim() || undefined,
        email: data.email?.trim() || undefined,
        cpf: data.cpf?.trim() || undefined,
        dataNascimento: data.dataNascimento ? new Date(data.dataNascimento as string) : undefined,
        endereco: data.endereco?.trim() || undefined,
        observacoes: data.observacoes?.trim() || undefined,
      };

      if (clienteEditando) {
        await updateClienteMutation.mutateAsync({ id: clienteEditando.id!, cliente: clienteData });
      } else {
        await createClienteMutation.mutateAsync({
          ...clienteData,
          aceiteLgpd: true,
          aceiteMarketing: false,
          status: 'ativo' as const,
        });
      }

      setShowModal(false);
      setClienteEditando(null);
      reset();
    } catch (error) {
      console.error('Erro ao salvar cliente:', error);
      showError('Erro', 'Erro ao salvar cliente');
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = await confirmDialog({
      title: 'Excluir Cliente',
      description: 'Tem certeza que deseja excluir este cliente?',
      variant: 'danger',
      confirmLabel: 'Excluir',
    });
    if (!confirmed) return;

    try {
      await deleteClienteMutation.mutateAsync(id);
    } catch (error) {
      console.error('Erro ao excluir cliente:', error);
      showError('Erro', 'Erro ao excluir cliente');
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatPhone = (phone: string) => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 11) {
      return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
    }
    return phone;
  };

  // Filtrar clientes
  const clientesFiltrados = clientes.filter(cliente => {
    if (!termoBusca) return true;
    const termo = termoBusca.toLowerCase();
    return (
      cliente.nome.toLowerCase().includes(termo) ||
      cliente.telefone?.toLowerCase().includes(termo) ||
      cliente.email?.toLowerCase().includes(termo) ||
      cliente.cpf?.includes(termo)
    );
  });

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <Loading size="lg" />
      </div>
    );
  }

  const columns = ['Cliente', 'Contato', 'Aniversário', 'Total Compras', 'Última Compra', 'Ações'];

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Clientes</h1>
            <p className="text-gray-500">Gerencie sua base de clientes</p>
          </div>
          <Button onClick={handleNovoCliente}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Cliente
          </Button>
        </div>

        {/* Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total de Clientes</p>
                <p className="text-2xl font-bold">{clientes.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="h-12 w-12 bg-pink-100 rounded-full flex items-center justify-center">
                <Cake className="h-6 w-6 text-pink-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Aniversariantes do Mês</p>
                <p className="text-2xl font-bold text-pink-600">
                  {aniversariantesDoMes}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center">
                <Users className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Clientes Ativos (30 dias)</p>
                <p className="text-2xl font-bold text-green-600">
                  {clientesAtivos30Dias}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Busca */}
        <Card>
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por nome, telefone, email ou CPF..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={termoBusca}
                onChange={(e) => setTermoBusca(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Tabela de clientes */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <Loading size="lg" />
              </div>
            ) : clientesFiltrados.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                <Users className="h-12 w-12 mb-2 text-gray-300" />
                <p>Nenhum cliente encontrado</p>
                {termoBusca && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2"
                    onClick={() => setTermoBusca('')}
                  >
                    Limpar busca
                  </Button>
                )}
              </div>
            ) : (
              <Table columns={columns}>
                {clientesFiltrados.map(cliente => (
                  <TableRow key={cliente.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{cliente.nome}</p>
                        {cliente.cpf && (
                          <p className="text-xs text-gray-500">CPF: {cliente.cpf}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {cliente.telefone && (
                          <p className="text-sm flex items-center gap-1">
                            <Phone className="h-3 w-3 text-gray-400" />
                            {formatPhone(cliente.telefone)}
                          </p>
                        )}
                        {cliente.email && (
                          <p className="text-sm flex items-center gap-1">
                            <Mail className="h-3 w-3 text-gray-400" />
                            {cliente.email}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {cliente.dataNascimento ? (
                        <Badge variant="primary">
                          <Cake className="h-3 w-3 mr-1" />
                          {format(new Date(cliente.dataNascimento), 'dd/MM')}
                        </Badge>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="font-medium text-green-600">
                        {formatCurrency(cliente.totalCompras || 0)}
                      </span>
                    </TableCell>
                    <TableCell>
                      {cliente.ultimaCompra ? (
                        <span className="text-sm text-gray-500">
                          {format(new Date(cliente.ultimaCompra), 'dd/MM/yyyy')}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditarCliente(cliente)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        {isAdmin && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(cliente.id!)}
                            className="text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modal de cadastro/edição */}
      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setClienteEditando(null);
          reset();
        }}
        title={clienteEditando ? 'Editar Cliente' : 'Novo Cliente'}
        size="lg"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Nome *"
            placeholder="Nome completo"
            {...register('nome')}
            error={errors.nome?.message}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Telefone"
              placeholder="(00) 00000-0000"
              {...register('telefone')}
              error={errors.telefone?.message}
            />
            <Input
              label="Email"
              type="email"
              placeholder="email@exemplo.com"
              {...register('email')}
              error={errors.email?.message}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="CPF"
              placeholder="000.000.000-00"
              {...register('cpf')}
              error={errors.cpf?.message}
            />
            <Input
              label="Data de Nascimento"
              type="date"
              {...register('dataNascimento')}
              error={errors.dataNascimento?.message}
            />
          </div>

          <Input
            label="Endereço"
            placeholder="Endereço completo"
            {...register('endereco')}
            error={errors.endereco?.message}
          />

          <Input
            label="Observações"
            placeholder="Observações sobre o cliente..."
            {...register('observacoes')}
            error={errors.observacoes?.message}
          />

          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              type="button"
              onClick={() => {
                setShowModal(false);
                setClienteEditando(null);
                reset();
              }}
            >
              Cancelar
            </Button>
            <Button type="submit" loading={salvando}>
              <Save className="h-4 w-4 mr-2" />
              {clienteEditando ? 'Salvar Alterações' : 'Cadastrar'}
            </Button>
          </div>
        </form>
      </Modal>

      {ConfirmDialogEl}
    </AppLayout>
  );
}
