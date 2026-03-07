'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { Popover } from './popover';
import { Button } from './button';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  isToday,
  isAfter,
  isBefore,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';

// ==========================================
// DATE PICKER
// ==========================================

interface DatePickerProps {
  /** Data selecionada */
  value?: Date | null;
  /** Callback quando a data muda */
  onChange?: (date: Date | null) => void;
  /** Placeholder do input */
  placeholder?: string;
  /** Data mínima selecionável */
  minDate?: Date;
  /** Data máxima selecionável */
  maxDate?: Date;
  /** Se está desabilitado */
  disabled?: boolean;
  /** Classes adicionais */
  className?: string;
  /** Formato de exibição */
  displayFormat?: string;
  /** Label do campo */
  label?: string;
  /** Mensagem de erro */
  error?: string;
}

export function DatePicker({
  value,
  onChange,
  placeholder = 'Selecione uma data',
  minDate,
  maxDate,
  disabled = false,
  className,
  displayFormat = 'dd/MM/yyyy',
  label,
  error,
}: DatePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [currentMonth, setCurrentMonth] = React.useState(value || new Date());

  const handleSelect = (date: Date) => {
    onChange?.(date);
    setIsOpen(false);
  };

  const handleClear = () => {
    onChange?.(null);
  };

  const isDateDisabled = (date: Date) => {
    if (minDate && isBefore(date, minDate)) return true;
    if (maxDate && isAfter(date, maxDate)) return true;
    return false;
  };

  return (
    <div className={cn('w-full', className)}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      
      <Popover
        open={isOpen}
        onOpenChange={setIsOpen}
        position="bottom"
        align="start"
        trigger={
          <button
            type="button"
            disabled={disabled}
            className={cn(
              'flex items-center justify-between w-full h-10 px-3 py-2 text-sm bg-white border rounded-md',
              'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
              error ? 'border-red-500' : 'border-gray-300',
              disabled && 'opacity-50 cursor-not-allowed',
            )}
          >
            <span className={value ? 'text-gray-900' : 'text-gray-500'}>
              {value ? format(value, displayFormat, { locale: ptBR }) : placeholder}
            </span>
            <Calendar className="h-4 w-4 text-gray-400" />
          </button>
        }
        className="p-3 w-70"
      >
        <CalendarGrid
          currentMonth={currentMonth}
          selectedDate={value}
          onSelect={handleSelect}
          onMonthChange={setCurrentMonth}
          isDateDisabled={isDateDisabled}
        />
        
        {value && (
          <div className="mt-2 pt-2 border-t flex justify-between">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleClear}
            >
              Limpar
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => {
                setCurrentMonth(new Date());
                handleSelect(new Date());
              }}
            >
              Hoje
            </Button>
          </div>
        )}
      </Popover>

      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}

// ==========================================
// CALENDAR GRID
// ==========================================

interface CalendarGridProps {
  currentMonth: Date;
  selectedDate?: Date | null;
  onSelect: (date: Date) => void;
  onMonthChange: (date: Date) => void;
  isDateDisabled?: (date: Date) => boolean;
}

function CalendarGrid({
  currentMonth,
  selectedDate,
  onSelect,
  onMonthChange,
  isDateDisabled,
}: CalendarGridProps) {
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { locale: ptBR });
  const endDate = endOfWeek(monthEnd, { locale: ptBR });

  const days: Date[] = [];
  let day = startDate;
  while (day <= endDate) {
    days.push(day);
    day = addDays(day, 1);
  }

  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  return (
    <div>
      {/* Header do mês */}
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          onClick={() => onMonthChange(subMonths(currentMonth, 1))}
          className="p-1 hover:bg-gray-100 rounded-full transition-colors"
        >
          <ChevronLeft className="h-5 w-5 text-gray-600" />
        </button>
        
        <span className="text-sm font-semibold text-gray-900">
          {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
        </span>
        
        <button
          type="button"
          onClick={() => onMonthChange(addMonths(currentMonth, 1))}
          className="p-1 hover:bg-gray-100 rounded-full transition-colors"
        >
          <ChevronRight className="h-5 w-5 text-gray-600" />
        </button>
      </div>

      {/* Dias da semana */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {weekDays.map((weekDay) => (
          <div 
            key={weekDay}
            className="text-center text-xs font-medium text-gray-500 py-1"
          >
            {weekDay}
          </div>
        ))}
      </div>

      {/* Dias do mês */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((dayDate, i) => {
          const isCurrentMonth = isSameMonth(dayDate, currentMonth);
          const isSelected = selectedDate && isSameDay(dayDate, selectedDate);
          const isTodayDate = isToday(dayDate);
          const isDisabled = isDateDisabled?.(dayDate);

          return (
            <button
              key={i}
              type="button"
              disabled={isDisabled}
              onClick={() => onSelect(dayDate)}
              className={cn(
                'w-8 h-8 text-sm rounded-full transition-colors',
                !isCurrentMonth && 'text-gray-300',
                isCurrentMonth && !isSelected && !isDisabled && 'text-gray-700 hover:bg-gray-100',
                isSelected && 'bg-blue-600 text-white hover:bg-blue-700',
                isTodayDate && !isSelected && 'border border-blue-600 text-blue-600',
                isDisabled && 'text-gray-300 cursor-not-allowed hover:bg-transparent',
              )}
            >
              {format(dayDate, 'd')}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ==========================================
// DATE RANGE PICKER
// ==========================================

interface DateRange {
  from: Date | null;
  to: Date | null;
}

interface DateRangePickerProps {
  value?: DateRange;
  onChange?: (range: DateRange) => void;
  placeholder?: string;
  minDate?: Date;
  maxDate?: Date;
  disabled?: boolean;
  className?: string;
  label?: string;
  error?: string;
}

export function DateRangePicker({
  value = { from: null, to: null },
  onChange,
  placeholder = 'Selecione um período',
  minDate,
  maxDate,
  disabled = false,
  className,
  label,
  error,
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [currentMonth, setCurrentMonth] = React.useState(value.from || new Date());
  const [selecting, setSelecting] = React.useState<'from' | 'to'>('from');

  const handleSelect = (date: Date) => {
    if (selecting === 'from') {
      onChange?.({ from: date, to: null });
      setSelecting('to');
    } else {
      if (value.from && isBefore(date, value.from)) {
        onChange?.({ from: date, to: value.from });
      } else {
        onChange?.({ from: value.from, to: date });
      }
      setSelecting('from');
      setIsOpen(false);
    }
  };

  const displayText = () => {
    if (!value.from) return placeholder;
    if (!value.to) return format(value.from, 'dd/MM/yyyy', { locale: ptBR });
    return `${format(value.from, 'dd/MM/yyyy', { locale: ptBR })} - ${format(value.to, 'dd/MM/yyyy', { locale: ptBR })}`;
  };

  const isDateDisabled = (date: Date) => {
    if (minDate && isBefore(date, minDate)) return true;
    if (maxDate && isAfter(date, maxDate)) return true;
    return false;
  };

  // Para uso futuro em highlight de range
  // const isInRange = (date: Date) => {
  //   if (!value.from || !value.to) return false;
  //   return isAfter(date, value.from) && isBefore(date, value.to);
  // };

  return (
    <div className={cn('w-full', className)}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      
      <Popover
        open={isOpen}
        onOpenChange={(open) => {
          setIsOpen(open);
          if (!open) setSelecting('from');
        }}
        position="bottom"
        align="start"
        trigger={
          <button
            type="button"
            disabled={disabled}
            className={cn(
              'flex items-center justify-between w-full h-10 px-3 py-2 text-sm bg-white border rounded-md',
              'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
              error ? 'border-red-500' : 'border-gray-300',
              disabled && 'opacity-50 cursor-not-allowed',
            )}
          >
            <span className={value.from ? 'text-gray-900' : 'text-gray-500'}>
              {displayText()}
            </span>
            <Calendar className="h-4 w-4 text-gray-400" />
          </button>
        }
        className="p-3 w-72"
      >
        <div className="mb-2 text-xs text-gray-500 text-center">
          {selecting === 'from' ? 'Selecione a data inicial' : 'Selecione a data final'}
        </div>
        
        <CalendarGrid
          currentMonth={currentMonth}
          selectedDate={selecting === 'from' ? value.from : value.to}
          onSelect={handleSelect}
          onMonthChange={setCurrentMonth}
          isDateDisabled={isDateDisabled}
        />
      </Popover>

      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}
