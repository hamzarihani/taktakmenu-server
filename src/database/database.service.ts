import { Injectable } from '@nestjs/common';
import { DataSource, QueryRunner } from 'typeorm';

@Injectable()
export class DatabaseService {
  constructor(private dataSource: DataSource) {}

  /**
   * Run a raw SQL query
   * 
   * ⚠️ SECURITY NOTE: Always use parameterized queries (params array) to prevent SQL injection.
   * Never concatenate user input directly into SQL strings.
   * 
   * ✅ SAFE: query('SELECT * FROM users WHERE id = ?', [userId])
   * ❌ UNSAFE: query(`SELECT * FROM users WHERE id = ${userId}`)
   */
  async query<T = any>(sql: string, params?: any[]): Promise<T> {
    // Ensure params are provided for queries that need them
    if (!params && sql.includes('?')) {
      throw new Error('SQL query contains placeholders but no parameters provided');
    }
    return this.dataSource.query(sql, params);
  }

  /**
   * Run operations inside a transaction
   */
  async transaction<T>(
    fn: (queryRunner: QueryRunner) => Promise<T>,
  ): Promise<T> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const result = await fn(queryRunner);
      await queryRunner.commitTransaction();
      return result;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
