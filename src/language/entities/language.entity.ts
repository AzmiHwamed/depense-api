import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
} from 'typeorm';


@Entity('languages')
export class Language {

  @PrimaryGeneratedColumn('uuid')
  id:string;


  @Index({unique:true})
  @Column()
  code:string;


  @Column()
  name:string;

}