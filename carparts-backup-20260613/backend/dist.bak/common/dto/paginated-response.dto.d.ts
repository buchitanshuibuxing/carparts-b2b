export declare class PaginatedResponseDto<T> {
    items: T[];
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
    constructor(items: T[], total: number, page: number, page_size: number);
}
