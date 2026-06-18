import { OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';
export declare class DatabaseModule implements OnModuleInit {
    private dataSource;
    constructor(dataSource: DataSource);
    onModuleInit(): Promise<void>;
}
