// Testes de Componentes - Componentes UI

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button, Input, Badge, Card, CardHeader, CardTitle, CardDescription, Loading, Modal } from '@/components/ui';

describe('Button', () => {
  test('renderiza corretamente', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button')).toHaveTextContent('Click me');
  });

  test('chama onClick ao clicar', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  test('desabilita quando disabled', () => {
    render(<Button disabled>Click me</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  test('aplica variante correta', () => {
    render(<Button variant="outline">Outline</Button>);
    expect(screen.getByRole('button')).toHaveClass('border');
  });

  test('mostra loading state', () => {
    render(<Button loading>Loading</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });
});

describe('Input', () => {
  test('renderiza corretamente', () => {
    render(<Input placeholder="Digite aqui" />);
    expect(screen.getByPlaceholderText('Digite aqui')).toBeInTheDocument();
  });

  test('aceita valor e onChange', () => {
    const handleChange = jest.fn();
    render(<Input value="test" onChange={handleChange} />);
    
    const input = screen.getByDisplayValue('test');
    fireEvent.change(input, { target: { value: 'new value' } });
    expect(handleChange).toHaveBeenCalled();
  });

  test('mostra erro quando fornecido', () => {
    render(<Input error="Campo obrigatório" />);
    expect(screen.getByText('Campo obrigatório')).toBeInTheDocument();
  });

  test('renderiza label', () => {
    render(<Input label="Nome" />);
    expect(screen.getByText('Nome')).toBeInTheDocument();
  });
});

describe('Badge', () => {
  test('renderiza corretamente', () => {
    render(<Badge>Status</Badge>);
    expect(screen.getByText('Status')).toBeInTheDocument();
  });

  test('aplica variante de cor', () => {
    render(<Badge variant="success">Sucesso</Badge>);
    expect(screen.getByText('Sucesso')).toHaveClass('bg-green-100');
  });
});

describe('Card', () => {
  test('renderiza children', () => {
    render(
      <Card>
        <p>Card content</p>
      </Card>
    );
    expect(screen.getByText('Card content')).toBeInTheDocument();
  });

  test('renderiza com CardHeader, CardTitle e CardDescription', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Título</CardTitle>
          <CardDescription>Descrição</CardDescription>
        </CardHeader>
        Conteúdo
      </Card>
    );
    expect(screen.getByText('Título')).toBeInTheDocument();
    expect(screen.getByText('Descrição')).toBeInTheDocument();
  });
});

describe('Loading', () => {
  test('renderiza corretamente', () => {
    render(<Loading />);
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  test('aplica tamanho lg', () => {
    render(<Loading size="lg" />);
    expect(document.querySelector('.h-12')).toBeInTheDocument();
  });
});

describe('Modal', () => {
  test('não renderiza quando fechado', () => {
    render(
      <Modal isOpen={false} onClose={() => {}}>
        Conteúdo
      </Modal>
    );
    expect(screen.queryByText('Conteúdo')).not.toBeInTheDocument();
  });

  test('renderiza quando aberto', () => {
    render(
      <Modal isOpen={true} onClose={() => {}}>
        Conteúdo do Modal
      </Modal>
    );
    expect(screen.getByText('Conteúdo do Modal')).toBeInTheDocument();
  });

  test('chama onClose ao clicar no overlay', () => {
    const handleClose = jest.fn();
    render(
      <Modal isOpen={true} onClose={handleClose}>
        Conteúdo
      </Modal>
    );
    
    // Clicar no overlay (backdrop)
    const backdrop = document.querySelector('.fixed.inset-0.bg-black');
    if (backdrop) {
      fireEvent.click(backdrop);
      expect(handleClose).toHaveBeenCalled();
    }
  });
});
