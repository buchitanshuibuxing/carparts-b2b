import { Repository } from 'typeorm';
import { PartClassification } from './entities/part-classification.entity';
export declare class PartClassificationsService {
    private repo;
    constructor(repo: Repository<PartClassification>);
    findAll(): Promise<PartClassification[]>;
    create(data: {
        name: string;
        parent_id?: number;
        description?: string;
    }): Promise<{
        name: string;
        parentId: number | undefined;
        description: string;
    } & PartClassification>;
    update(id: number, data: {
        name?: string;
        description?: string;
        sort_order?: number;
    }): Promise<PartClassification | null>;
    delete(id: number): Promise<void>;
}
