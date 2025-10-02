import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  isLoading?: boolean;
}

export default function Pagination({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
  isLoading = false
}: PaginationProps) {
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  const handleFirstPage = () => {
    if (currentPage !== 1 && !isLoading) {
      onPageChange(1);
    }
  };

  const handlePreviousPage = () => {
    if (currentPage > 1 && !isLoading) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages && !isLoading) {
      onPageChange(currentPage + 1);
    }
  };

  const handleLastPage = () => {
    if (currentPage !== totalPages && !isLoading) {
      onPageChange(totalPages);
    }
  };

  if (totalPages <= 1) return null;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-3 bg-gray-50 rounded-lg border border-gray-200">
      <div className="text-sm text-gray-600">
        Mostrando <span className="font-medium text-gray-900">{startItem}</span> a{' '}
        <span className="font-medium text-gray-900">{endItem}</span> de{' '}
        <span className="font-medium text-gray-900">{totalItems}</span> movimentações
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={handleFirstPage}
          disabled={currentPage === 1 || isLoading}
          className="p-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title="Primeira página"
        >
          <ChevronsLeft className="w-4 h-4 text-gray-600" />
        </button>

        <button
          onClick={handlePreviousPage}
          disabled={currentPage === 1 || isLoading}
          className="p-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title="Página anterior"
        >
          <ChevronLeft className="w-4 h-4 text-gray-600" />
        </button>

        <div className="px-4 py-2 text-sm font-medium text-gray-900 bg-white border border-gray-300 rounded-lg">
          Página {currentPage} de {totalPages}
        </div>

        <button
          onClick={handleNextPage}
          disabled={currentPage === totalPages || isLoading}
          className="p-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title="Próxima página"
        >
          <ChevronRight className="w-4 h-4 text-gray-600" />
        </button>

        <button
          onClick={handleLastPage}
          disabled={currentPage === totalPages || isLoading}
          className="p-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title="Última página"
        >
          <ChevronsRight className="w-4 h-4 text-gray-600" />
        </button>
      </div>
    </div>
  );
}
