class CreateScheduledJobs < ActiveRecord::Migration[8.0]
  def change
    create_table :scheduled_jobs do |t|
      t.string :job_type, null: false
      t.string :status, null: false, default: 'pending'
      t.datetime :scheduled_at, null: false
      t.datetime :started_at
      t.datetime :completed_at
      t.text :options
      t.text :result
      t.text :error_message
      t.string :lock_token
      t.integer :retry_count, default: 0
      t.integer :max_retries, default: 3
      t.references :parent_job, foreign_key: { to_table: :scheduled_jobs }

      t.timestamps
    end

    add_index :scheduled_jobs, [:job_type, :scheduled_at]
    add_index :scheduled_jobs, :status
    add_index :scheduled_jobs, :scheduled_at
  end
end
