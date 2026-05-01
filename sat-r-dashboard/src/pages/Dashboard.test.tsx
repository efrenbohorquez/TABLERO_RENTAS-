import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Dashboard from './Dashboard';

// Mock del hook useData para evitar peticiones fetch reales durante el test
vi.mock('../hooks/useData', () => ({
  useData: () => ({
    data: null,
    forecast: null,
    cvMetrics: null,
    loading: true,
    error: null,
  }),
}));

describe('Dashboard Component - Control de Calidad', () => {
  it('se renderiza estado de carga correctamente (Smoke Test)', () => {
    render(<Dashboard />);
    expect(screen.getByText(/Cargando/i)).toBeInTheDocument();
  });
});
