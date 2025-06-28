import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";

@Entity({ name: "normalized_events" })
export class NormalizedEvent {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column()
    unified_campaign_id!: string;

    @Column()
    campaign_name!: string;

    @Column()
    source_platform!: string;

    @Column()
    event_date!: string;

    @Column("int")
    impressions!: number;

    @Column("int")
    clicks!: number;

    @Column("decimal")
    spend!: number;

    @Column("int")
    conversions!: number;
}
