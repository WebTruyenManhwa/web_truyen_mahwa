# Hệ thống Auto Crawl và Job Scheduling

Tài liệu này mô tả chi tiết về hệ thống tự động crawl dữ liệu manga và hệ thống job scheduling trong ứng dụng.

## Mục lục

1. [Tổng quan](#tổng-quan)
2. [Cài đặt](#cài-đặt)
3. [Tính năng Auto Crawl Manga](#tính-năng-auto-crawl-manga)
   - [Crawl một manga](#crawl-một-manga)
   - [Crawl nhiều chapter](#crawl-nhiều-chapter)
   - [Tùy chọn chapter range](#tùy-chọn-chapter-range)
   - [Lên lịch crawl tự động](#lên-lịch-crawl-tự-động)
4. [Hệ thống Job Scheduling](#hệ-thống-job-scheduling)
   - [Scheduled Crawls](#scheduled-crawls)
   - [Scheduled Jobs](#scheduled-jobs)
   - [SchedulerService](#schedulerservice)
5. [API Reference](#api-reference)
   - [Proxy API](#proxy-api)
   - [Scheduled Crawls API](#scheduled-crawls-api)
   - [Scheduled Jobs API](#scheduled-jobs-api)
6. [Cấu trúc Database](#cấu-trúc-database)
7. [Xử lý lỗi và Retry](#xử-lý-lỗi-và-retry)
8. [Monitoring và Logging](#monitoring-và-logging)
9. [Best Practices](#best-practices)

## Tổng quan

Hệ thống auto crawl và job scheduling được thiết kế để tự động hóa việc thu thập dữ liệu manga từ các trang web nguồn như NetTruyen. Hệ thống bao gồm:

- **Manga Crawler**: Crawl thông tin manga và chapter từ các trang web nguồn
- **Scheduled Crawls**: Lên lịch crawl định kỳ cho các manga
- **Job Scheduling**: Hệ thống quản lý và theo dõi các job

Hệ thống sử dụng `rufus-scheduler` cho việc lên lịch và database để lưu trữ thông tin job, đảm bảo tính persistence và khả năng phục hồi khi server khởi động lại.

## Cài đặt

1. Chạy migration để tạo các bảng cần thiết:

```bash
rails db:migrate
```

2. Đảm bảo đã thêm gem `rufus-scheduler` vào Gemfile:

```ruby
gem 'rufus-scheduler'
```

3. Khởi động server:

```bash
rails server
```

## Tính năng Auto Crawl Manga

### Crawl một manga

Để crawl một manga từ URL:

```bash
curl -X POST http://localhost:3001/api/v1/proxy/crawl_manga \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://nettruyen1905.com/manga/ta-la-ta-de",
    "max_chapters": "all",
    "delay": "3..7"
  }'
```

Tham số:
- `url`: URL của trang manga cần crawl
- `max_chapters`: Số lượng chapter tối đa cần crawl hoặc "all" để crawl tất cả
- `delay`: Range delay giữa các request, format: "min..max" (đơn vị: giây)

### Crawl nhiều chapter

Để crawl một số lượng chapter cụ thể:

```bash
curl -X POST http://localhost:3001/api/v1/proxy/crawl_manga \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://nettruyen1905.com/manga/ta-la-ta-de",
    "max_chapters": 10,
    "chapter_range": "1-10",
    "delay": "3..7"
  }'
```

Tham số bổ sung:
- `chapter_range`: Range chapter cần crawl, format: "start-end" (ví dụ: "1-10")

### Tùy chọn chapter range

Khi sử dụng `max_chapters` là một số, bạn phải chỉ định `chapter_range`. Điều này cho phép bạn crawl một số lượng chapter cụ thể trong một range nhất định.

Ví dụ, để crawl 5 chapter từ chapter 10 đến chapter 20:

```bash
curl -X POST http://localhost:3001/api/v1/proxy/crawl_manga \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://nettruyen1905.com/manga/ta-la-ta-de",
    "max_chapters": 5,
    "chapter_range": "10-20",
    "delay": "3..7"
  }'
```

Hệ thống sẽ crawl 5 chapter đầu tiên trong range từ chapter 10 đến chapter 20.

### Lên lịch crawl tự động

Để lên lịch crawl tự động cho một manga:
 - Đặt lịch crawl hàng ngày
```bash
curl -X POST http://localhost:3001/api/v1/proxy/crawl_manga \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://nettruyen1905.com/manga/ta-la-ta-de",
    "max_chapters": "all",
    "delay": "3..7",
    "schedule": true,
    "schedule_type": "daily",
    "schedule_time": "03:00"
  }'
```
- Đặt lịch crawl hàng tuần  (thứ 2, 4, 6)
```bash
curl -X POST http://localhost:3001/api/v1/proxy/crawl_manga \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://nettruyen1905.com/manga/ta-la-ta-de",
    "max_chapters": 10,
    "chapter_range": "7-20",
    "delay": "3..7",
    "schedule": true,
    "schedule_type": "weekly",
    "schedule_time": "03:00",
    "schedule_days": "1,3,5"
  }'
```
- Đặt lịch crawl hàng tháng
```bash
curl -X POST http://localhost:3001/api/v1/proxy/crawl_manga \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://nettruyen1905.com/manga/ta-la-ta-de",
    "max_chapters": "all",
    "delay": "3..7",
    "schedule": true,
    "schedule_type": "monthly",
    "schedule_time": "03:00"
  }'
```

Tham số lên lịch:
- `schedule`: Set `true` để tạo lịch crawl thay vì chạy ngay
- `schedule_type`: Loại lịch, có thể là "daily", "weekly", hoặc "monthly"
- `schedule_time`: Thời gian chạy trong ngày, format: "HH:MM"
- `schedule_days`: (Chỉ dùng với `schedule_type` là "weekly") Các ngày trong tuần để chạy, format: "1,2,3" (1: Thứ 2, 7: Chủ nhật)

## Hệ thống Job Scheduling

### Scheduled Crawls

`ScheduledCrawl` là một model lưu trữ thông tin về các lịch crawl manga. Mỗi scheduled crawl bao gồm:

- Manga liên kết
- URL nguồn
- Loại lịch (daily, weekly, monthly)
- Thời gian chạy trong ngày
- Các ngày trong tuần để chạy (đối với weekly)
- Tùy chọn crawl (max_chapters, chapter_range, delay)
- Trạng thái (active, paused, completed)
- Thời gian chạy lần cuối và lần tiếp theo

### Scheduled Jobs

`ScheduledJob` là một model lưu trữ thông tin về các job đã lên lịch. Mỗi scheduled job bao gồm:

- Loại job (scheduled_crawl_check, single_job)
- Trạng thái (pending, running, completed, failed)
- Thời gian lên lịch
- Thời gian bắt đầu và hoàn thành
- Tùy chọn (dưới dạng JSON)
- Kết quả và thông báo lỗi
- Thông tin về retry

### SchedulerService

`SchedulerService` là service chịu trách nhiệm quản lý và thực thi các job được lên lịch. Service này cung cấp các phương thức chính:

```ruby
# Lên lịch một job mới
SchedulerService.schedule_job(job_type, options = {}, scheduled_at = Time.current)

# Thực thi một job
SchedulerService.execute_job(job)

# Kiểm tra và thực thi các job đang chờ
SchedulerService.check_pending_jobs

# Giải phóng các lock bị treo
SchedulerService.release_stale_locks
```

Các loại job được hỗ trợ:
- `single_job`: Job đơn lẻ, thực thi một lần
- `scheduled_crawl_check`: Job kiểm tra và thực thi các scheduled crawl
- `analytics_report`: Job tạo báo cáo phân tích
- `system_maintenance`: Job bảo trì hệ thống

Để sử dụng SchedulerService trong controller, thay vì gọi `perform_later`, hãy sử dụng:

```ruby
SchedulerService.schedule_job('single_job', {
  class_name: 'YourJobClass',
  method_name: 'perform',
  arguments: [arg1, arg2, ...],
  priority: 'high' # tùy chọn
})
```

## API Reference

### Proxy API

#### Crawl Manga

```
POST /api/v1/proxy/crawl_manga
```

Tham số:
- `url`: URL của trang manga cần crawl (required)
- `max_chapters`: Số lượng chapter tối đa cần crawl hoặc "all" (optional)
- `chapter_range`: Range chapter cần crawl, format: "start-end" (required if max_chapters is a number)
- `delay`: Range delay giữa các request, format: "min..max" (optional)
- `schedule`: Tùy chọn đặt lịch, `true` để tạo lịch crawl (optional)
- `schedule_type`: Loại lịch (daily, weekly, monthly) (required if schedule=true)
- `schedule_time`: Thời gian chạy trong ngày, format: "HH:MM" (required if schedule=true)
- `schedule_days`: Các ngày trong tuần để chạy, format: "1,2,3" (required if schedule_type=weekly)

#### Batch Import Chapters

```
POST /api/v1/proxy/batch_import_chapters
```

Tham số:
- `manga_id`: ID của manga cần thêm chapter (required)
- `urls`: Mảng các URL của chapter cần import (required)
- `auto_number`: Tự động đánh số chapter (default: true)
- `start_number`: Số bắt đầu cho việc đánh số tự động (default: 1)

### Scheduled Crawls API

#### List Scheduled Crawls

```
GET /api/v1/scheduled_crawls
```

Tham số:
- `manga_id`: Lọc theo manga ID (optional)
- `status`: Lọc theo trạng thái (optional)

#### Get Scheduled Crawl

```
GET /api/v1/scheduled_crawls/:id
```

#### Create Scheduled Crawl

```
POST /api/v1/scheduled_crawls
```

Tham số:
- `manga_id`: ID của manga (required)
- `url`: URL của trang manga (optional if manga has source_url)
- `schedule_type`: Loại lịch (daily, weekly, monthly) (required)
- `schedule_time`: Thời gian chạy trong ngày, format: "HH:MM" (required)
- `schedule_days`: Các ngày trong tuần để chạy, format: "1,2,3" (required if schedule_type=weekly)
- `max_chapters`: Số lượng chapter tối đa cần crawl hoặc "all" (optional)
- `chapter_range`: Range chapter cần crawl, format: "start-end" (required if max_chapters is a number)
- `delay`: Range delay giữa các request, format: "min..max" (optional)
- `status`: Trạng thái (active, paused, completed) (default: active)

#### Update Scheduled Crawl

```
PUT /api/v1/scheduled_crawls/:id
```

Tham số: Giống như Create

#### Delete Scheduled Crawl

```
DELETE /api/v1/scheduled_crawls/:id
```

#### Run Scheduled Crawl Now

```
POST /api/v1/scheduled_crawls/:id/run_now
```

### Scheduled Jobs API

#### List Scheduled Jobs

```
GET /api/v1/scheduled_jobs
```

Tham số:
- `job_type`: Lọc theo loại job (optional)
- `status`: Lọc theo trạng thái (optional)
- `page`: Số trang (default: 1)
- `per_page`: Số item mỗi trang (default: 20)

#### Get Scheduled Job

```
GET /api/v1/scheduled_jobs/:id
```

#### Retry Failed Job

```
POST /api/v1/scheduled_jobs/:id/retry
```

#### Cancel Pending Job

```
POST /api/v1/scheduled_jobs/:id/cancel
```

#### Get Job Statistics

```
GET /api/v1/scheduled_jobs/stats
```

## Cấu trúc Database

### Bảng scheduled_crawls

| Column | Type | Description |
|--------|------|-------------|
| id | integer | Primary key |
| manga_id | integer | Foreign key to mangas table |
| url | string | URL of the manga page |
| schedule_type | string | Type of schedule (daily, weekly, monthly) |
| schedule_time | time | Time of day to run |
| schedule_days | string | Days of week to run (for weekly) |
| max_chapters | string | Maximum number of chapters to crawl or "all" |
| chapter_range | string | Range of chapters to crawl, format: "start-end" |
| delay | string | Delay between requests, format: "min..max" |
| status | string | Status (active, paused, completed) |
| last_run_at | datetime | Last time the crawl was executed |
| next_run_at | datetime | Next scheduled time to run |
| created_at | datetime | Creation timestamp |
| updated_at | datetime | Last update timestamp |

### Bảng scheduled_jobs

| Column | Type | Description |
|--------|------|-------------|
| id | integer | Primary key |
| job_type | string | Type of job (scheduled_crawl_check, single_job, analytics_report, system_maintenance) |
| status | string | Status (pending, running, completed, failed) |
| scheduled_at | datetime | Time when the job is scheduled to run |
| started_at | datetime | Time when the job started running |
| completed_at | datetime | Time when the job completed or failed |
| options | text | JSON-encoded options for the job |
| result | text | JSON-encoded result of the job |
| error_message | text | Error message if the job failed |
| lock_token | string | Token to prevent concurrent execution |
| retry_count | integer | Number of retries attempted |
| max_retries | integer | Maximum number of retries allowed |
| parent_job_id | integer | Foreign key to parent job (for retries) |
| priority | string | Priority of the job (high, normal, low) |
| created_at | datetime | Creation timestamp |
| updated_at | datetime | Last update timestamp |

## Xử lý lỗi và Retry

Hệ thống có cơ chế xử lý lỗi và retry tự động:

1. Khi một job thất bại, nó được đánh dấu là `failed` và thông báo lỗi được lưu lại
2. Nếu số lần retry chưa đạt giới hạn, một job mới sẽ được tạo với thời gian delay tăng dần theo cấp số nhân (exponential backoff)
3. Có thể thủ công retry một job đã thất bại thông qua API
4. Các lock bị treo (quá 30 phút) sẽ được tự động giải phóng

## Monitoring và Logging

Hệ thống cung cấp các công cụ để theo dõi và debug:

1. API để xem thống kê về các job (`/api/v1/scheduled_jobs/stats`)
2. Log chi tiết về các job đang chạy, đã hoàn thành và thất bại
3. Thông tin về thời gian chạy, kết quả và lỗi được lưu trong database
4. Cơ chế dọn dẹp tự động để tránh database phình to

## Best Practices

1. **Delay giữa các request**: Luôn đặt delay hợp lý (ví dụ: "3..7") để tránh bị chặn IP
2. **Chapter range**: Khi crawl một số lượng lớn chapter, nên chia nhỏ thành nhiều lần crawl với chapter range khác nhau
3. **Lên lịch**: Nên lên lịch crawl vào thời điểm ít người truy cập (ví dụ: 3:00 AM)
4. **Monitoring**: Thường xuyên kiểm tra thống kê và log để phát hiện và xử lý sớm các vấn đề
5. **Backup**: Nên backup database định kỳ để tránh mất dữ liệu job khi có sự cố
6. **Ưu tiên**: Sử dụng trường `priority` để đảm bảo các job quan trọng được xử lý trước

Kiểm tra xem trang web có đc crawl ko
curl -s https://nettruyen1905.com/robots.txt
