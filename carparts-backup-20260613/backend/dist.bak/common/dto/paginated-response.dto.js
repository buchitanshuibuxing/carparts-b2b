"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaginatedResponseDto = void 0;
class PaginatedResponseDto {
    items;
    total;
    page;
    page_size;
    total_pages;
    constructor(items, total, page, page_size) {
        this.items = items;
        this.total = total;
        this.page = page;
        this.page_size = page_size;
        this.total_pages = Math.ceil(total / page_size);
    }
}
exports.PaginatedResponseDto = PaginatedResponseDto;
//# sourceMappingURL=paginated-response.dto.js.map