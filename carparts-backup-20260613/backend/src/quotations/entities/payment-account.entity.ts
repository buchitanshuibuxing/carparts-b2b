import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from "typeorm";

@Entity("payment_accounts")
export class PaymentAccount {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "account_name" })
  accountName: string;

  @Column({ name: "beneficiary_name", default: "" })
  beneficiaryName: string;

  @Column({ name: "bank_name", default: "" })
  bankName: string;

  @Column({ name: "bank_address", default: "" })
  bankAddress: string;

  @Column({ name: "swift_code", default: "" })
  swiftCode: string;

  @Column({ name: "account_number", default: "" })
  accountNumber: string;

  @Column({ default: "USD" })
  currency: string;

  @Column({ default: "" })
  remark: string;

  @Column({ name: "is_default", default: false })
  isDefault: boolean;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;
}
