export class PaginatedResponseDto<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;

  constructor(items: T[], total: number, page: number, page_size: number) {
    this.items = items;
    this.total = total;
    this.page = page;
    this.page_size = page_size;
    this.total_pages = Math.ceil(total / page_size);
  }
}
