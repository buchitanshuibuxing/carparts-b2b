import { PartClassificationsService } from './part-classifications.service';
export declare class PartClassificationsController {
    private svc;
    constructor(svc: PartClassificationsService);
    findAll(): Promise<import("./entities/part-classification.entity").PartClassification[]>;
    create(body: {
        name: string;
        parent_id?: number;
        description?: string;
    }): Promise<{
        name: string;
        parentId: number | undefined;
        description: string;
    } & import("./entities/part-classification.entity").PartClassification>;
    update(id: number, body: {
        name?: string;
        description?: string;
        sort_order?: number;
    }): Promise<import("./entities/part-classification.entity").PartClassification | null>;
    delete(id: number): Promise<void>;
}
