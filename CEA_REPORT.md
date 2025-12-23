# Smart Parking Management System: Cloud Architecture Design Document

**Complex Engineering Activity (CEA)**  
**Cloud Computing (SE-315)**  
**Military College of Signals, NUST**

**Team Members:**
- [Team Member 1 Name - Registration Number]
- [Team Member 2 Name - Registration Number]
- [Team Member 3 Name - Registration Number]
- [Team Member 4 Name - Registration Number]
- [Team Member 5 Name - Registration Number]

**Date:** December 22, 2025

---

## 1. Executive Summary & Introduction

### 1.1 Problem Context

Urban areas face significant challenges with parking management, leading to wasted time, increased fuel consumption, and environmental pollution. Drivers often spend considerable time searching for available parking spaces, while parking facility operators struggle with inefficient space utilization and manual management processes.

The Smart Parking Management System addresses these challenges by providing real-time visibility of parking slot availability, enabling online bookings, and facilitating digital payments through a secure, scalable cloud-based platform. The system serves two primary user roles: regular users who need to find and book parking spaces, and administrators who manage parking locations, monitor occupancy, and analyze usage patterns.

### 1.2 System Overview

The Smart Parking Management System is a multi-tier web application built using Next.js, featuring:

- **Frontend Layer**: React-based user interface for both users and administrators
- **Backend Layer**: RESTful API routes handling authentication, bookings, payments, and administrative operations
- **Data Layer**: In-memory data store with JSON file persistence for parking locations, slots, bookings, and user data

The current implementation uses an in-memory database initialized from seed data (`parkingdata.json`), which provides a foundation for understanding system behavior before migrating to a production-grade cloud infrastructure.

### 1.3 CEA Objectives & Learning Outcomes

This Complex Engineering Activity aims to architect and justify a secure, scalable, fault-tolerant multi-tier cloud deployment for the Smart Parking Management System. The exercise focuses on engineering-grade design without actual resource deployment, emphasizing:

**CLO1 - Design & Justify Cloud Architecture:**
- Design a comprehensive multi-tier cloud architecture
- Justify technology choices and architectural decisions
- Document component specifications and network topology

**CLO2 - Analyze Reliability, Scalability, Security & Operations:**
- Analyze failure modes and recovery mechanisms
- Design scalability strategies and performance optimization
- Implement comprehensive security controls
- Define operational procedures and monitoring strategies

**CLO4 - Evaluate Cost and Optimization Trade-offs:**
- Estimate baseline infrastructure costs
- Propose optimization strategies with cost-benefit analysis
- Evaluate trade-offs between cost, performance, and reliability

### 1.4 Scope and Assumptions

**Scope:**
- Architecture design for AWS cloud platform (concepts applicable to Azure/GCP)
- Multi-tier deployment: Frontend, Backend APIs, and Data Store
- Security, reliability, scalability, and operational considerations
- Cost estimation and optimization strategies
- Testing and risk management frameworks

**Assumptions:**
- Baseline workload: ~10,000 daily active users (DAU)
- Peak traffic: ~100 requests per second (RPS) with 3× safety margin
- Target availability: 99.9% uptime (approximately 8.76 hours downtime per year)
- Target latency: p95 response time < 300ms
- Target error rate: < 1% of requests
- Recovery Point Objective (RPO): 5 minutes
- Recovery Time Objective (RTO): 30 minutes
- Data retention: 90 days for bookings, 365 days for audit logs
- Compliance requirements: General data protection standards (no specific regulatory requirements assumed)

---

## 2. High-Level Architecture Diagram

[Figure 1: High-Level Architecture Diagram - Multi-Tier Cloud Deployment]

### 2.1 Architecture Overview

The Smart Parking Management System follows a three-tier architecture pattern deployed on Amazon Web Services (AWS), designed for high availability, scalability, and security.

**Tier 1 - Presentation Layer (Frontend):**
- **Technology**: Next.js static site generation (SSG) and server-side rendering (SSR)
- **Deployment**: Static assets hosted on Amazon S3, served via Amazon CloudFront CDN
- **Components**: React components, client-side routing, authentication UI, booking interface, admin dashboard
- **Trust Boundary**: Public-facing, accessible via HTTPS

**Tier 2 - Application Layer (Backend):**
- **Technology**: Next.js API Routes (Node.js runtime)
- **Deployment**: Containerized application running on Amazon ECS Fargate
- **Components**: RESTful API endpoints (`/api/auth/*`, `/api/bookings`, `/api/locations`, `/api/payments`)
- **Trust Boundary**: Private subnets, accessible only through Application Load Balancer (ALB)

**Tier 3 - Data Layer:**
- **Technology**: Amazon RDS PostgreSQL (Multi-AZ) for persistent data, Amazon ElastiCache Redis for caching
- **Deployment**: RDS in private data subnets, Redis cluster for session and cache management
- **Components**: User authentication data, parking locations, slot availability, bookings, payment records
- **Trust Boundary**: Private subnets, no direct internet access

### 2.2 Network Topology

**Virtual Private Cloud (VPC) Design:**
- **CIDR Block**: 10.0.0.0/16
- **Availability Zones**: 3 AZs (us-east-1a, us-east-1b, us-east-1c) for high availability
- **Subnet Strategy**:
  - **Public Subnets** (10.0.1.0/24, 10.0.2.0/24, 10.0.3.0/24): ALB, NAT Gateways, CloudFront edge locations
  - **Private App Subnets** (10.0.10.0/24, 10.0.11.0/24, 10.0.12.0/24): ECS Fargate tasks
  - **Private Data Subnets** (10.0.20.0/24, 10.0.21.0/24, 10.0.22.0/24): RDS and ElastiCache

**Network Components:**
- **Internet Gateway**: Provides internet access for public subnets
- **NAT Gateways**: One per AZ for outbound internet access from private subnets
- **Application Load Balancer (ALB)**: Distributes traffic across ECS tasks, handles SSL termination
- **Route Tables**: Separate routing for public and private subnets
- **VPC Endpoints**: For S3 and Secrets Manager access (reduces NAT Gateway costs)

### 2.3 Trust Boundaries

**External Trust Boundary:**
- Internet users and administrators access the system through CloudFront CDN
- AWS WAF (Web Application Firewall) filters malicious traffic before reaching ALB

**DMZ Trust Boundary:**
- ALB resides in public subnets but is protected by security groups
- Only allows inbound HTTPS (443) from CloudFront IP ranges

**Application Trust Boundary:**
- ECS tasks in private subnets can only communicate with ALB and data tier
- No direct internet access; outbound traffic through NAT Gateway

**Data Trust Boundary:**
- RDS and ElastiCache in isolated private subnets
- Accessible only from application tier via security groups
- No public endpoints or internet connectivity

### 2.4 Data Flow

**User Request Flow:**
1. User/Admin → Browser initiates HTTPS request
2. Browser → CloudFront CDN (edge location nearest to user)
3. CloudFront → AWS WAF (traffic filtering and rate limiting)
4. WAF → Application Load Balancer (traffic distribution)
5. ALB → ECS Fargate Task (API route processing)
6. ECS Task → ElastiCache Redis (check cache for parking availability)
7. ECS Task → RDS PostgreSQL (persist booking, update slot status)
8. Response flows back through the same path

**Admin Update Flow:**
1. Admin → Frontend (update slot status via admin interface)
2. Frontend → API Route (`/api/admin/parkingdata`)
3. API Route → RDS (update parking slot status)
4. API Route → ElastiCache (invalidate cache)
5. Response → Admin (confirmation of update)

---

## 3. Detailed Design Document

### 3.1 Component Specifications

#### 3.1.1 Frontend Component

**Technology Stack:**
- **Framework**: Next.js 16.0.0 (React 19.2.0)
- **UI Library**: Radix UI components, Tailwind CSS
- **State Management**: React Context API (`auth-context.tsx`)
- **Form Handling**: React Hook Form with Zod validation

**Deployment Architecture:**
- **Build Process**: Next.js static export for production builds
- **Hosting**: Amazon S3 bucket configured for static website hosting
- **CDN**: Amazon CloudFront distribution with:
  - Custom SSL certificate (ACM)
  - Compression enabled (Gzip/Brotli)
  - Cache policies: aggressive caching for static assets, no-cache for API routes
  - Origin failover to S3

**Component Structure:**
- `app/page.tsx`: Landing page with location selection
- `app/login/page.tsx`: Authentication interface
- `app/home/page.tsx`: User dashboard
- `app/booking/page.tsx`: Booking management
- `app/admin/page.tsx`: Admin dashboard
- `components/parking-grid.tsx`: Real-time slot visualization
- `components/booking-popup.tsx`: Booking creation interface

**Justification:**
- **Next.js**: Provides SSR/SSG capabilities, excellent developer experience, built-in API routes (though we use separate backend), and strong TypeScript support
- **Pros**: Fast page loads, SEO-friendly, code splitting, optimized images
- **Cons**: Build complexity, requires Node.js build environment
- **S3 + CloudFront**: Industry-standard static hosting with global CDN, low latency, cost-effective
- **Pros**: High availability, automatic scaling, pay-per-use pricing
- **Cons**: Requires separate API backend (acceptable for our architecture)

#### 3.1.2 Backend Component

**Technology Stack:**
- **Runtime**: Node.js 20.x LTS
- **Framework**: Next.js API Routes (serverless functions)
- **Container Base**: Node.js official Docker image (alpine variant for smaller size)

**Deployment Architecture:**
- **Container Platform**: Amazon ECS Fargate
- **Task Definition**:
  - CPU: 0.5 vCPU (512 CPU units)
  - Memory: 1 GB
  - Container Image: ECR-hosted Docker image
  - Environment Variables: Loaded from AWS Secrets Manager
- **Service Configuration**:
  - Desired Count: 3 tasks (minimum for high availability)
  - Maximum Count: 10 tasks (autoscaling limit)
  - Health Check: HTTP GET `/api/health` endpoint
  - Health Check Grace Period: 60 seconds

**API Endpoints:**
- `POST /api/auth/login`: User authentication
- `POST /api/auth/signup`: User registration
- `GET /api/locations`: Retrieve parking locations
- `GET /api/bookings`: List user bookings
- `POST /api/bookings`: Create new booking
- `PATCH /api/bookings`: Update booking (payment)
- `GET /api/admin/parkingdata`: Admin data retrieval
- `POST /api/payments`: Process payment transactions

**Justification:**
- **ECS Fargate**: Serverless container platform, no EC2 management overhead
- **Pros**: Automatic scaling, pay-per-use, integrated with ALB, supports Docker
- **Cons**: Higher cost per vCPU-hour compared to EC2, less control over underlying infrastructure
- **Alternative Considered**: AWS Lambda - Rejected due to cold start latency and 15-minute timeout limits for long-running operations
- **Next.js API Routes**: Leverages existing codebase, consistent with frontend technology
- **Pros**: TypeScript support, shared code with frontend, simple deployment
- **Cons**: Less optimized than dedicated API frameworks (Express.js), acceptable trade-off for consistency

#### 3.1.3 Data Layer Component

**Primary Database: Amazon RDS PostgreSQL**

**Configuration:**
- **Engine**: PostgreSQL 15.x
- **Instance Class**: db.t3.medium (2 vCPU, 4 GB RAM)
- **Storage**: 100 GB General Purpose SSD (gp3), auto-scaling enabled up to 500 GB
- **Multi-AZ**: Enabled for high availability and automatic failover
- **Backup**: Automated daily backups, 7-day retention, point-in-time recovery enabled
- **Encryption**: At-rest encryption using AWS KMS

**Schema Design:**
- **users**: User accounts, authentication data, roles
- **parking_locations**: Location metadata (name, address, total slots)
- **parking_slots**: Individual slot status (location_id, slot_number, is_occupied)
- **bookings**: Booking records (user_id, location_id, slot_number, timestamps, payment_status)
- **payments**: Payment transaction records
- **audit_logs**: Administrative actions and system events

**Caching Layer: Amazon ElastiCache Redis**

**Configuration:**
- **Engine**: Redis 7.x
- **Node Type**: cache.t3.micro (0.5 GB RAM) - can scale to cache.t3.small for production
- **Cluster Mode**: Disabled (single node for cost efficiency, can enable cluster mode for scaling)
- **TTL Strategy**: 
  - Parking availability: 30 seconds
  - User sessions: 24 hours
  - Location metadata: 1 hour

**Justification:**
- **RDS PostgreSQL**: Managed relational database, ACID compliance, SQL support
- **Pros**: Automatic backups, Multi-AZ failover, point-in-time recovery, managed patching
- **Cons**: Higher cost than self-managed, less flexibility than NoSQL for some use cases
- **Alternative Considered**: DynamoDB - Rejected due to need for complex queries (joins, aggregations) and team familiarity with SQL
- **ElastiCache Redis**: In-memory caching reduces database load
- **Pros**: Sub-millisecond latency, reduces RDS costs, improves user experience
- **Cons**: Additional cost, requires cache invalidation strategy

### 3.2 Technology Choices Justification

**Frontend: Next.js vs. React + Vite**
- **Chosen**: Next.js
- **Rationale**: Built-in SSR/SSG, API routes (though not used in production), excellent developer experience, strong ecosystem
- **Trade-off**: Larger bundle size vs. better SEO and initial load performance

**Backend: ECS Fargate vs. EC2 vs. Lambda**
- **Chosen**: ECS Fargate
- **Rationale**: No server management, automatic scaling, container-based (Docker), cost-effective for consistent workloads
- **Trade-off**: Higher per-hour cost vs. Lambda, but no cold starts and better for long-running connections

**Database: RDS PostgreSQL vs. DynamoDB vs. Aurora**
- **Chosen**: RDS PostgreSQL
- **Rationale**: Relational data model fits parking system (locations, slots, bookings), SQL queries, cost-effective for medium workloads
- **Trade-off**: Less scalable than DynamoDB, but more cost-effective than Aurora for this workload size

**Caching: ElastiCache Redis vs. Application-level caching**
- **Chosen**: ElastiCache Redis
- **Rationale**: Dedicated caching layer, shared across instances, sub-millisecond latency
- **Trade-off**: Additional infrastructure cost vs. significant database load reduction

### 3.3 Sizing Rationale

#### 3.3.1 Compute Resources (ECS Fargate)

**Baseline Calculation:**
- **Assumed Load**: 100 RPS peak (with 3× safety margin = 33 RPS actual peak)
- **Request Processing Time**: ~50ms average (including database queries)
- **Concurrent Requests per Task**: 0.5 vCPU can handle ~10 concurrent requests comfortably
- **Required Tasks**: 100 RPS × 0.05s = 5 concurrent requests, need 1 task minimum, but 3 for redundancy

**Task Sizing:**
- **CPU**: 0.5 vCPU (512 CPU units) - sufficient for Node.js API routes
- **Memory**: 1 GB - Node.js runtime + application code + buffer space
- **Justification**: Lightweight API routes, no heavy computation, memory sufficient for request handling

**Scaling Configuration:**
- **Minimum Tasks**: 3 (one per AZ for high availability)
- **Maximum Tasks**: 10 (handles 3× peak load = 300 RPS)
- **Target CPU Utilization**: 70% (triggers scale-out)
- **Target Memory Utilization**: 80% (triggers scale-out)

#### 3.3.2 Database Sizing (RDS PostgreSQL)

**Storage Calculation:**
- **Users**: 10,000 users × 1 KB = 10 MB
- **Locations**: 50 locations × 5 KB = 250 KB
- **Slots**: 50 locations × 100 slots × 200 bytes = 1 MB
- **Bookings**: 10,000 DAU × 2 bookings/day × 1 KB × 90 days = 1.8 GB
- **Payments**: 20,000 bookings/month × 500 bytes × 12 months = 12 MB
- **Indexes & Overhead**: ~30% = 600 MB
- **Total**: ~2.5 GB, rounded to 100 GB for growth and performance

**Instance Sizing:**
- **db.t3.medium**: 2 vCPU, 4 GB RAM
- **Justification**: 
  - Read-heavy workload (slot availability checks)
  - Connection pool: ~50 concurrent connections (sufficient for 3-10 ECS tasks)
  - Query complexity: Simple SELECTs and UPDATEs, no complex joins
  - Can scale vertically to db.t3.large if needed

#### 3.3.3 Storage Requirements (S3)

**Frontend Assets:**
- **Static Files**: ~50 MB (JavaScript bundles, CSS, images)
- **CDN Cache**: CloudFront handles caching, S3 serves as origin

**Application Logs:**
- **Log Volume**: ~100 MB/day × 30 days = 3 GB/month
- **Retention**: 90 days = 9 GB
- **Storage Class**: Standard for active logs, Intelligent-Tiering for older logs

**Backups:**
- **RDS Snapshots**: Automated daily backups, ~5 GB per snapshot × 7 days = 35 GB
- **Total S3 Storage**: ~50 GB (with growth buffer)

### 3.4 Network Design

**VPC Configuration:**
- **CIDR**: 10.0.0.0/16 (65,536 IP addresses)
- **DNS Resolution**: Enabled
- **DNS Hostnames**: Enabled

**Subnet Allocation:**
- **Public Subnets**: 10.0.1.0/24, 10.0.2.0/24, 10.0.3.0/24 (256 IPs each, sufficient for ALB and NAT)
- **Private App Subnets**: 10.0.10.0/24, 10.0.11.0/24, 10.0.12.0/24 (256 IPs each, sufficient for ECS tasks)
- **Private Data Subnets**: 10.0.20.0/24, 10.0.21.0/24, 10.0.22.0/24 (256 IPs each, sufficient for RDS and Redis)

**Security Groups:**

**ALB Security Group:**
- Inbound: HTTPS (443) from CloudFront IP ranges (0.0.0.0/0 with WAF protection)
- Outbound: All traffic to ECS tasks

**ECS Task Security Group:**
- Inbound: HTTP (80) from ALB security group only
- Outbound: HTTPS (443) to RDS and ElastiCache security groups, HTTPS to internet via NAT

**RDS Security Group:**
- Inbound: PostgreSQL (5432) from ECS task security group only
- Outbound: None

**ElastiCache Security Group:**
- Inbound: Redis (6379) from ECS task security group only
- Outbound: None

**NAT Gateway:**
- One NAT Gateway per AZ for redundancy
- Elastic IP addresses for each NAT Gateway
- Routes outbound traffic from private subnets to internet

---

## 4. Reliability & Fault-Tolerance Analysis

### 4.1 Failure Modes

#### 4.1.1 Application Layer Failures

**ECS Task Failures:**
- **Failure Scenarios**: 
  - Container crash due to unhandled exception
  - Out of memory errors
  - Application bugs causing infinite loops
  - Health check failures
- **Impact**: Requests to failed task return 5xx errors, user experience degradation
- **Detection**: ECS health checks (HTTP GET `/api/health`), CloudWatch metrics (CPU, memory, request count)
- **Recovery**: ECS automatically stops unhealthy tasks and starts replacements, ALB routes traffic away from unhealthy tasks

**ECS Service Failures:**
- **Failure Scenarios**:
  - All tasks in an AZ fail simultaneously
  - ECS service misconfiguration
  - Container image pull failures
- **Impact**: Complete service unavailability if all tasks fail
- **Detection**: CloudWatch alarms on service task count, ALB target health metrics
- **Recovery**: ECS maintains desired task count across AZs, automatic task replacement

#### 4.1.2 Data Layer Failures

**RDS Instance Failures:**
- **Failure Scenarios**:
  - Primary instance hardware failure
  - Database corruption
  - Storage failure
  - Network connectivity issues
- **Impact**: All write operations fail, read operations may fail if primary is down
- **Detection**: RDS automated monitoring, CloudWatch RDS metrics
- **Recovery**: Multi-AZ automatic failover (typically 60-120 seconds), point-in-time recovery for data corruption

**RDS Storage Failures:**
- **Failure Scenarios**:
  - EBS volume failure
  - Storage quota exhaustion
- **Impact**: Database becomes read-only or unavailable
- **Detection**: CloudWatch storage metrics, RDS automated alerts
- **Recovery**: Automatic storage scaling (if enabled), EBS volume replacement, restore from snapshot

**ElastiCache Failures:**
- **Failure Scenarios**:
  - Redis node failure
  - Memory exhaustion
  - Network partition
- **Impact**: Cache misses increase database load, potential performance degradation
- **Detection**: CloudWatch ElastiCache metrics, application-level cache error handling
- **Recovery**: Application falls back to direct database queries, ElastiCache automatic replacement (if enabled)

#### 4.1.3 Network Failures

**Availability Zone Failures:**
- **Failure Scenarios**:
  - Complete AZ outage
  - Network partition within AZ
  - Power failure in data center
- **Impact**: Services in affected AZ become unavailable
- **Detection**: CloudWatch cross-AZ metrics, ALB target health checks
- **Recovery**: Traffic automatically routes to healthy AZs, ECS tasks in other AZs handle load

**ALB Failures:**
- **Failure Scenarios**:
  - ALB instance failure
  - Misconfigured target groups
  - SSL certificate expiration
- **Impact**: All traffic routing fails, complete service unavailability
- **Detection**: CloudWatch ALB metrics, SSL certificate monitoring
- **Recovery**: ALB is highly available across AZs, automatic SSL certificate renewal via ACM

**NAT Gateway Failures:**
- **Failure Scenarios**:
  - NAT Gateway instance failure
  - Elastic IP release
- **Impact**: ECS tasks cannot access internet (external APIs, package updates)
- **Detection**: CloudWatch NAT Gateway metrics, application-level connection timeouts
- **Recovery**: NAT Gateway redundancy across AZs, VPC endpoints for AWS services reduce dependency

#### 4.1.4 External Dependency Failures

**Payment Gateway Failures:**
- **Failure Scenarios**:
  - Third-party payment API downtime
  - Network connectivity issues
  - API rate limiting
- **Impact**: Payment processing fails, bookings cannot be completed
- **Detection**: Application-level error handling, external API health checks
- **Recovery**: Graceful error messages to users, retry logic with exponential backoff, queue failed payments for retry

**CloudFront/CDN Failures:**
- **Failure Scenarios**:
  - CloudFront edge location failures
  - Origin (S3) unavailability
  - DNS resolution failures
- **Impact**: Frontend assets unavailable, users cannot access application
- **Detection**: CloudWatch CloudFront metrics, Route 53 health checks
- **Recovery**: CloudFront automatic failover to healthy edge locations, S3 cross-region replication for origin redundancy

### 4.2 Recovery Behavior

#### 4.2.1 Automatic Failover Mechanisms

**ECS Task Auto-Recovery:**
- **Health Checks**: HTTP GET `/api/health` every 30 seconds
- **Grace Period**: 60 seconds before marking unhealthy
- **Action**: Unhealthy tasks are stopped and replaced automatically
- **Recovery Time**: Typically 2-5 minutes for new task to start and pass health checks

**RDS Multi-AZ Failover:**
- **Detection**: RDS automated monitoring detects primary instance failure
- **Failover Process**: 
  1. Promote standby replica to primary (typically 60-120 seconds)
  2. Update DNS endpoint to point to new primary
  3. Application automatically reconnects using existing connection pooling
- **Data Loss**: Zero data loss (synchronous replication)
- **Recovery Time**: 60-120 seconds (RTO)

**ALB Target Health:**
- **Health Checks**: HTTP GET to `/api/health` every 30 seconds
- **Unhealthy Threshold**: 2 consecutive failures
- **Action**: ALB stops routing traffic to unhealthy targets
- **Recovery**: Automatic traffic restoration when targets become healthy

#### 4.2.2 Health Checks and Self-Healing

**Application Health Endpoint:**
```typescript
// /api/health endpoint implementation
GET /api/health
Response: { status: "healthy", timestamp: "...", checks: { db: "ok", cache: "ok" } }
```

**Health Check Components:**
- **Database Connectivity**: Verify PostgreSQL connection pool
- **Cache Connectivity**: Verify Redis connection
- **Application Status**: Verify application is responsive

**Self-Healing Mechanisms:**
- **ECS**: Automatic task replacement for failed containers
- **RDS**: Automatic failover to standby instance
- **ElastiCache**: Automatic node replacement (if enabled)
- **ALB**: Automatic traffic routing away from unhealthy targets

#### 4.2.3 Data Recovery from Seed Files

**Current Implementation:**
- System initializes from `parkingdata.json` seed file
- In-memory database populated on application start
- Data persistence through JSON file updates

**Cloud Migration Strategy:**
- **Initial Data Load**: One-time migration script to populate RDS from `parkingdata.json`
- **Backup Strategy**: 
  - Automated daily RDS snapshots (7-day retention)
  - Point-in-time recovery enabled (5-minute granularity)
  - Manual snapshot before major changes
- **Disaster Recovery**: 
  - Restore from latest snapshot to new RDS instance
  - Replay transaction logs for point-in-time recovery
  - Estimated recovery time: 30 minutes (RTO)

**Seed Data Reload Process:**
- **Use Case**: Complete data corruption or accidental deletion
- **Process**:
  1. Stop application traffic (maintenance mode)
  2. Restore RDS from snapshot or reload from seed file
  3. Verify data integrity
  4. Resume traffic
- **Recovery Time**: 15-30 minutes depending on data volume

### 4.3 Service Level Objectives (SLOs)

#### 4.3.1 Availability Targets

**Target**: 99.9% uptime (Three Nines)
- **Allowed Downtime**: 43.2 minutes per month, 8.76 hours per year
- **Measurement**: Percentage of successful requests (excluding planned maintenance)
- **Monitoring**: CloudWatch availability metrics, ALB target health
- **Calculation**: (Total time - Downtime) / Total time × 100%

**Availability Breakdown:**
- **Frontend (CloudFront + S3)**: 99.99% (AWS SLA)
- **Backend (ECS + ALB)**: 99.9% (with Multi-AZ deployment)
- **Database (RDS Multi-AZ)**: 99.95% (AWS SLA)
- **Overall System**: 99.9% (bottleneck is backend layer)

#### 4.3.2 Latency Targets

**Target**: p95 response time < 300ms
- **Measurement**: 95th percentile of response times
- **Monitoring**: CloudWatch ALB response time metrics, application APM
- **Breakdown**:
  - API endpoint processing: < 200ms
  - Database query time: < 50ms
  - Cache lookup: < 5ms
  - Network overhead: < 45ms

**Latency by Endpoint:**
- **GET /api/locations**: < 100ms (cached)
- **GET /api/bookings**: < 150ms
- **POST /api/bookings**: < 250ms (includes database write)
- **POST /api/payments**: < 300ms (includes external API call)

#### 4.3.3 Error Rate Targets

**Target**: Error rate < 1% of total requests
- **Measurement**: (5xx errors + 4xx errors) / Total requests × 100%
- **Monitoring**: CloudWatch ALB error rate metrics
- **Breakdown**:
  - 5xx errors (server errors): < 0.5%
  - 4xx errors (client errors): < 0.5% (excluding authentication failures)

**Error Rate Monitoring:**
- **Real-time Alerts**: CloudWatch alarm triggers if error rate > 1% for 5 minutes
- **Error Tracking**: Application logs aggregated in CloudWatch Logs Insights
- **Error Categories**: Database errors, external API failures, application exceptions

#### 4.3.4 Recovery Objectives

**Recovery Point Objective (RPO): 5 minutes**
- **Definition**: Maximum acceptable data loss in case of failure
- **Implementation**: 
  - RDS automated backups every 5 minutes (point-in-time recovery)
  - Application-level transaction logging
- **Justification**: Parking slot bookings are time-sensitive; 5-minute data loss is acceptable for non-critical updates

**Recovery Time Objective (RTO): 30 minutes**
- **Definition**: Maximum acceptable downtime before service restoration
- **Implementation**:
  - RDS Multi-AZ failover: 60-120 seconds
  - ECS task replacement: 2-5 minutes
  - Manual intervention scenarios: 30 minutes maximum
- **Justification**: 30-minute downtime acceptable for parking system (users can use alternative methods temporarily)

---

## 5. Scalability & Performance Plan

### 5.1 Current System Analysis

#### 5.1.1 In-Memory Store Limitations

**Current Architecture:**
- In-memory Maps (`Map<string, User>`, `Map<string, ParkingLocation>`, `Map<string, ParkingSlot>`)
- JSON file persistence (`parkingdata.json`, `bookings.json`, `auth.json`)
- Single-process Node.js application

**Limitations:**
1. **Single Instance Constraint**: In-memory data not shared across instances
   - **Impact**: Multiple ECS tasks would have inconsistent data
   - **Solution**: Migrate to RDS PostgreSQL for shared state

2. **Memory Constraints**: All data loaded into memory
   - **Impact**: Limited by available RAM, cannot scale to large datasets
   - **Solution**: Database-backed storage with pagination

3. **Concurrency Issues**: No transaction management
   - **Impact**: Race conditions when multiple users book same slot simultaneously
   - **Solution**: Database transactions with row-level locking

4. **Persistence Reliability**: File-based storage vulnerable to data loss
   - **Impact**: Risk of data corruption or loss on container restart
   - **Solution**: Managed database with automated backups

5. **Scalability**: Cannot scale horizontally
   - **Impact**: Single instance bottleneck, cannot handle increased load
   - **Solution**: Stateless application tier with shared database

#### 5.1.2 Performance Bottlenecks

**Identified Bottlenecks:**
1. **Synchronous File I/O**: JSON file reads/writes block event loop
   - **Impact**: High latency under concurrent load
   - **Mitigation**: Async database operations with connection pooling

2. **No Caching**: Every request hits data store
   - **Impact**: Unnecessary database load for frequently accessed data
   - **Mitigation**: Redis caching for parking availability and location metadata

3. **Sequential Processing**: No parallel request handling optimization
   - **Impact**: Underutilized CPU resources
   - **Mitigation**: Node.js event loop handles concurrent requests efficiently, but database connection pooling improves throughput

### 5.2 Scaling Strategy

#### 5.2.1 Horizontal Scaling (ECS Autoscaling)

**Scaling Dimensions:**
- **Request Rate**: Scale based on ALB request count per target
- **CPU Utilization**: Scale based on average CPU utilization across tasks
- **Memory Utilization**: Scale based on average memory utilization
- **Custom Metrics**: Scale based on application-specific metrics (e.g., active bookings)

**Autoscaling Policy:**
```
Scale-Out Conditions (OR logic):
- Average CPU utilization > 70% for 2 minutes
- Average request count per target > 50 RPS for 2 minutes
- Average memory utilization > 80% for 2 minutes

Scale-In Conditions (AND logic):
- Average CPU utilization < 30% for 10 minutes
- Average request count per target < 10 RPS for 10 minutes
- Average memory utilization < 50% for 10 minutes

Scaling Limits:
- Minimum Tasks: 3 (one per AZ)
- Maximum Tasks: 10
- Scale-Out Step: +2 tasks
- Scale-In Step: -1 task
- Cooldown: 60 seconds (scale-out), 300 seconds (scale-in)
```

**Scaling Calculation:**
- **Baseline**: 3 tasks handling 33 RPS actual peak
- **Peak Load**: 100 RPS (with safety margin)
- **Tasks Required**: 100 RPS / (33 RPS / 3 tasks) = 9 tasks
- **Maximum**: 10 tasks provides buffer for traffic spikes

#### 5.2.2 Vertical Scaling (Database)

**RDS Scaling Strategy:**
- **Current**: db.t3.medium (2 vCPU, 4 GB RAM)
- **Scale-Up Path**: db.t3.large (2 vCPU, 8 GB RAM) → db.t3.xlarge (4 vCPU, 16 GB RAM)
- **Scale-Down Path**: Monitor metrics, scale down during low-traffic periods

**Scaling Triggers:**
- **CPU Utilization**: > 70% sustained for 1 hour
- **Memory Utilization**: > 80% sustained for 1 hour
- **Connection Count**: > 80% of max connections
- **Read Replica**: Add read replica if read load > write load × 2

**Read Replica Strategy:**
- **Use Case**: Read-heavy workloads (parking availability checks)
- **Configuration**: One read replica in different AZ
- **Application**: Route read queries to replica, write queries to primary
- **Benefit**: Distribute read load, improve query performance

#### 5.2.3 Caching Strategy (Redis/ElastiCache)

**Cache Layers:**

**Layer 1: Application-Level Caching (In-Memory)**
- **Scope**: Per-request caching, request-scoped data
- **TTL**: Request duration only
- **Use Case**: Avoid duplicate queries within same request

**Layer 2: Redis Cache (ElastiCache)**
- **Cache Keys**:
  - `location:{locationId}`: Location metadata (TTL: 1 hour)
  - `slots:{locationId}`: Slot availability array (TTL: 30 seconds)
  - `user:{userId}`: User session data (TTL: 24 hours)
  - `booking:{bookingId}`: Booking details (TTL: 5 minutes)

**Cache Invalidation Strategy:**
- **Write-Through**: Update cache on write operations
- **Write-Behind**: Async cache updates for non-critical data
- **TTL-Based**: Automatic expiration for time-sensitive data
- **Manual Invalidation**: Admin updates trigger cache clear

**Cache Hit Rate Target**: > 80% for read operations
- **Measurement**: Cache hits / (Cache hits + Cache misses)
- **Monitoring**: ElastiCache cache hit rate metric
- **Optimization**: Adjust TTL values based on access patterns

### 5.3 Autoscaling Policies

#### 5.3.1 CPU-Based Scaling

**Policy Configuration:**
- **Metric**: Average CPU utilization across all tasks
- **Target**: 70% CPU utilization
- **Evaluation Period**: 2 minutes
- **Data Points**: 2 consecutive periods above threshold

**Scaling Behavior:**
- **Scale-Out**: Add 2 tasks when CPU > 70%
- **Scale-In**: Remove 1 task when CPU < 30% for 10 minutes
- **Cooldown**: 60 seconds (scale-out), 300 seconds (scale-in)

**Justification**: 
- 70% target allows headroom for traffic spikes
- 2-minute evaluation prevents thrashing from brief spikes
- Scale-out faster than scale-in to handle sudden load increases

#### 5.3.2 Request Rate-Based Scaling

**Policy Configuration:**
- **Metric**: ALB request count per target
- **Target**: 50 requests per second per target
- **Evaluation Period**: 2 minutes
- **Data Points**: 2 consecutive periods above threshold

**Scaling Behavior:**
- **Scale-Out**: Add 2 tasks when RPS/target > 50
- **Scale-In**: Remove 1 task when RPS/target < 10 for 10 minutes
- **Cooldown**: 60 seconds (scale-out), 300 seconds (scale-in)

**Justification**:
- 50 RPS per task provides good utilization without overload
- Request rate more directly correlates with user experience than CPU
- Prevents scaling delays during traffic spikes

#### 5.3.3 Scheduled Scaling

**Policy Configuration:**
- **Use Case**: Predictable traffic patterns (e.g., weekday vs. weekend, business hours)
- **Schedule**: 
  - **Weekday Morning (8 AM - 10 AM)**: Scale to 5 tasks (rush hour)
  - **Weekday Afternoon (2 PM - 6 PM)**: Scale to 6 tasks (peak hours)
  - **Weekend**: Scale to 4 tasks (moderate traffic)
  - **Night (10 PM - 6 AM)**: Scale to 3 tasks (minimum)

**Implementation**: 
- AWS Application Auto Scaling scheduled actions
- Overrides target tracking policies during scheduled periods
- Cost optimization: Reduce tasks during low-traffic periods

### 5.4 Capacity Calculations

#### 5.4.1 Baseline Workload Assumptions

**User Metrics:**
- **Daily Active Users (DAU)**: 10,000
- **Peak Concurrent Users**: 1,000 (10% of DAU)
- **Average Session Duration**: 5 minutes
- **Requests per Session**: 10 requests
- **Peak Hour**: 2 PM - 6 PM (40% of daily traffic)

**Request Patterns:**
- **Read Operations**: 70% (location browsing, slot availability checks)
- **Write Operations**: 30% (bookings, payments, admin updates)
- **Peak Request Rate**: 100 RPS (with 3× safety margin)
- **Actual Peak**: ~33 RPS (100 / 3)

**Request Distribution:**
- **GET /api/locations**: 40% (40 RPS peak)
- **GET /api/bookings**: 20% (20 RPS peak)
- **POST /api/bookings**: 15% (15 RPS peak)
- **POST /api/payments**: 10% (10 RPS peak)
- **Admin APIs**: 5% (5 RPS peak)
- **Other**: 10% (10 RPS peak)

#### 5.4.2 Resource Requirements per Tier

**Frontend Tier (CloudFront + S3):**
- **Bandwidth**: 10,000 DAU × 5 MB per session = 50 GB/day
- **Requests**: 10,000 DAU × 50 page requests/day = 500,000 requests/day
- **Storage**: 50 MB static assets
- **Scaling**: Automatic via CloudFront (no manual scaling needed)

**Backend Tier (ECS Fargate):**
- **CPU**: 0.5 vCPU per task
- **Memory**: 1 GB per task
- **Tasks Required**: 3 tasks minimum (baseline), 10 tasks maximum (peak)
- **Total CPU**: 0.5 × 10 = 5 vCPU (peak)
- **Total Memory**: 1 GB × 10 = 10 GB (peak)

**Database Tier (RDS PostgreSQL):**
- **Connections**: 10 tasks × 5 connections/task = 50 concurrent connections
- **CPU**: 2 vCPU (db.t3.medium)
- **Memory**: 4 GB RAM
- **Storage**: 100 GB (with auto-scaling to 500 GB)
- **IOPS**: 3,000 IOPS (gp3 storage)

**Cache Tier (ElastiCache Redis):**
- **Memory**: 0.5 GB (cache.t3.micro)
- **Connections**: 10 tasks × 10 connections/task = 100 concurrent connections
- **Throughput**: ~100,000 operations/second (sufficient for caching)

#### 5.4.3 Growth Projections

**Year 1 Growth:**
- **DAU Growth**: 10,000 → 15,000 (+50%)
- **Peak RPS**: 100 → 150 RPS
- **Tasks Required**: 10 → 15 tasks (scale to maximum, then increase task size)
- **Database**: Scale to db.t3.large (8 GB RAM) if needed

**Year 2 Growth:**
- **DAU Growth**: 15,000 → 25,000 (+67%)
- **Peak RPS**: 150 → 250 RPS
- **Tasks Required**: Increase task size to 1 vCPU, 2 GB RAM, maintain 10-15 tasks
- **Database**: Add read replica, consider db.t3.xlarge
- **Cache**: Scale to cache.t3.small (1.37 GB RAM)

**Year 3 Growth:**
- **DAU Growth**: 25,000 → 50,000 (+100%)
- **Peak RPS**: 250 → 500 RPS
- **Architecture Changes**: 
  - Consider Aurora PostgreSQL for better scalability
  - Implement Redis cluster mode
  - Add additional read replicas
  - Consider regional distribution (multi-region deployment)

**Scaling Milestones:**
- **10,000 DAU**: Current baseline architecture
- **25,000 DAU**: Add read replica, scale cache
- **50,000 DAU**: Consider Aurora, Redis cluster
- **100,000 DAU**: Multi-region deployment, CDN optimization

---

## 6. Security Design

### 6.1 Encryption

#### 6.1.1 Encryption in Transit

**HTTPS/TLS Implementation:**
- **Frontend to CloudFront**: HTTPS enforced (TLS 1.2 minimum, TLS 1.3 preferred)
- **CloudFront to ALB**: HTTPS with end-to-end encryption
- **ALB to ECS**: HTTPS with SSL termination at ALB
- **ECS to RDS**: TLS 1.2+ for database connections
- **ECS to ElastiCache**: TLS 1.2+ for Redis connections

**Certificate Management:**
- **CloudFront**: AWS Certificate Manager (ACM) certificate for custom domain
- **ALB**: ACM certificate for SSL termination
- **Automatic Renewal**: ACM handles certificate renewal automatically
- **Certificate Validation**: Domain validation via DNS records

**Security Headers:**
- **Strict-Transport-Security (HSTS)**: `max-age=31536000; includeSubDomains; preload`
- **Content-Security-Policy (CSP)**: Restrict resource loading to trusted sources
- **X-Content-Type-Options**: `nosniff`
- **X-Frame-Options**: `DENY` (prevent clickjacking)
- **X-XSS-Protection**: `1; mode=block`

#### 6.1.2 Encryption at Rest

**Database Encryption:**
- **RDS Encryption**: Enabled using AWS KMS (Key Management Service)
- **Encryption Key**: AWS managed key (aws/rds) or customer-managed CMK
- **Encrypted Data**: Database files, automated backups, read replicas, snapshots
- **Key Rotation**: Automatic key rotation every 365 days (if using CMK)

**Cache Encryption:**
- **ElastiCache Encryption**: Encryption in transit enabled (TLS)
- **At-Rest Encryption**: Not applicable (in-memory cache, data expires)

**Storage Encryption:**
- **S3 Encryption**: Server-side encryption (SSE-S3) for static assets
- **S3 Bucket Policy**: Enforce encryption for all uploads
- **Backup Encryption**: RDS snapshots encrypted using same KMS key

**Secrets Encryption:**
- **Secrets Manager**: All secrets encrypted at rest using KMS
- **Environment Variables**: Encrypted in ECS task definitions
- **Application Secrets**: JWT signing keys, API keys stored in Secrets Manager

### 6.2 Authentication & Authorization

#### 6.2.1 Current Authentication Implementation

**JWT-Based Authentication:**
- **Token Generation**: Custom token generation (`token_${userId}_${timestamp}`)
- **Token Storage**: Client-side (localStorage or sessionStorage)
- **Token Validation**: Server-side validation on each API request
- **Session Management**: Stateless JWT tokens (no server-side session storage)

**Authentication Flow:**
1. User submits credentials via `/api/auth/login`
2. Server validates credentials against database
3. Server generates JWT token with user ID and role
4. Client stores token and includes in Authorization header
5. Server validates token on subsequent requests

**Current Limitations:**
- Simple token format (not standard JWT)
- No token expiration mechanism
- No refresh token strategy
- Password stored in plaintext (critical security issue)

#### 6.2.2 Enhanced Authentication Design

**JWT Token Structure:**
```json
{
  "sub": "user_id",
  "email": "user@example.com",
  "role": "user|admin",
  "iat": 1234567890,
  "exp": 1234571490,
  "jti": "unique_token_id"
}
```

**Token Management:**
- **Access Token**: Short-lived (15 minutes), stored in memory
- **Refresh Token**: Long-lived (7 days), stored in HTTP-only cookie
- **Token Rotation**: Refresh token rotated on each use
- **Token Revocation**: Maintain token blacklist in Redis

**Password Security:**
- **Hashing**: bcrypt with cost factor 12
- **Salt**: Automatic salt generation per password
- **Password Policy**: Minimum 8 characters, complexity requirements
- **Password Reset**: Secure token-based reset flow

#### 6.2.3 Role-Based Access Control (RBAC)

**User Roles:**
- **User Role**: 
  - Read: Own bookings, parking locations, slot availability
  - Write: Create bookings, update own profile
  - Denied: Admin endpoints, user management, location management

- **Admin Role**:
  - Read: All bookings, all users, analytics, system logs
  - Write: Manage locations, update slot status, view payments
  - Denied: Delete critical data without audit trail

**Authorization Implementation:**
- **Middleware**: Role-based route protection
- **API Endpoints**: Check user role before processing requests
- **Frontend**: Conditional rendering based on user role
- **Database**: Row-level security (RLS) for user data isolation

**Access Control Matrix:**

| Resource | User | Admin |
|----------|------|-------|
| View Locations | ✓ | ✓ |
| View Slots | ✓ | ✓ |
| Create Booking | ✓ | ✓ |
| View Own Bookings | ✓ | ✓ |
| View All Bookings | ✗ | ✓ |
| Update Slot Status | ✗ | ✓ |
| Manage Locations | ✗ | ✓ |
| View Analytics | ✗ | ✓ |
| Manage Users | ✗ | ✓ |

### 6.3 IAM Strategy

#### 6.3.1 Least Privilege Principles

**IAM Roles for ECS Tasks:**
- **ECS Task Role**: Minimal permissions for application operations
  - Read/Write: Secrets Manager (specific secrets only)
  - Read: Parameter Store (configuration)
  - Write: CloudWatch Logs (application logs)
  - Denied: All other AWS services

**IAM Roles for CI/CD:**
- **GitHub Actions / GitLab CI Role**: Deployment permissions only
  - Read: ECR (pull images)
  - Write: ECR (push images)
  - Write: ECS (update services)
  - Write: S3 (upload static assets)
  - Denied: Production database access, user data access

**IAM Roles for Administrators:**
- **Read-Only Role**: CloudWatch, RDS metrics, logs
- **Developer Role**: ECS service updates, non-production access
- **Admin Role**: Full access with MFA requirement

#### 6.3.2 Service Roles

**ECS Service Role:**
- **Permissions**: ECS service management, load balancer registration
- **Attached Policies**: `AmazonEC2ContainerServiceRole`

**RDS Service Role:**
- **Permissions**: Automated backup management, CloudWatch integration
- **Attached Policies**: `rds-monitoring-role`

**ElastiCache Service Role:**
- **Permissions**: CloudWatch metrics, backup management
- **Attached Policies**: `AmazonElastiCacheServiceRole`

#### 6.3.3 User Access Management

**AWS IAM Users:**
- **MFA Required**: All IAM users must enable MFA
- **Access Keys**: Rotated every 90 days
- **Password Policy**: 
  - Minimum length: 14 characters
  - Complexity: Upper, lower, numbers, special characters
  - Expiration: 90 days
  - History: Cannot reuse last 12 passwords

**Federated Access:**
- **SSO Integration**: AWS SSO for centralized access management
- **SAML Providers**: Integration with corporate identity providers
- **Temporary Credentials**: Use AWS STS for temporary access

### 6.4 Network Segmentation

#### 6.4.1 Subnet Strategy

**Public Subnets:**
- **Purpose**: Internet-facing resources (ALB, NAT Gateways)
- **Internet Gateway**: Direct internet access
- **Security**: Strict security groups, WAF protection
- **Resources**: ALB, NAT Gateways, CloudFront edge locations

**Private App Subnets:**
- **Purpose**: Application tier (ECS tasks)
- **Internet Access**: Outbound only via NAT Gateway
- **Security**: No direct internet ingress, security group restrictions
- **Resources**: ECS Fargate tasks

**Private Data Subnets:**
- **Purpose**: Data tier (RDS, ElastiCache)
- **Internet Access**: None
- **Security**: Accessible only from app subnets
- **Resources**: RDS instances, ElastiCache clusters

#### 6.4.2 Security Groups

**ALB Security Group:**
```
Inbound Rules:
- HTTPS (443) from CloudFront IP ranges (0.0.0.0/0 with WAF)
- HTTP (80) redirect to HTTPS

Outbound Rules:
- All traffic to ECS task security group
```

**ECS Task Security Group:**
```
Inbound Rules:
- HTTP (80) from ALB security group only

Outbound Rules:
- PostgreSQL (5432) to RDS security group
- Redis (6379) to ElastiCache security group
- HTTPS (443) to internet (via NAT Gateway)
```

**RDS Security Group:**
```
Inbound Rules:
- PostgreSQL (5432) from ECS task security group only

Outbound Rules:
- None (no internet access)
```

**ElastiCache Security Group:**
```
Inbound Rules:
- Redis (6379) from ECS task security group only

Outbound Rules:
- None (no internet access)
```

#### 6.4.3 Network ACLs (NACLs)

**Public Subnet NACL:**
- **Inbound**: Allow HTTPS from 0.0.0.0/0, ephemeral ports
- **Outbound**: Allow all traffic
- **Purpose**: Additional layer of network security

**Private App Subnet NACL:**
- **Inbound**: Allow traffic from ALB subnet, ephemeral ports
- **Outbound**: Allow HTTPS to internet, database ports to data subnet
- **Purpose**: Restrict lateral movement

**Private Data Subnet NACL:**
- **Inbound**: Allow database ports from app subnet only
- **Outbound**: Allow ephemeral ports to app subnet
- **Purpose**: Isolate data tier completely

### 6.5 Web Application Firewall (WAF)

#### 6.5.1 WAF Rules (OWASP Top 10)

**SQL Injection Protection:**
- **Rule**: AWS Managed Rule Set - SQL Injection
- **Action**: Block requests matching SQL injection patterns
- **Sensitivity**: Medium (balance security vs. false positives)

**Cross-Site Scripting (XSS) Protection:**
- **Rule**: AWS Managed Rule Set - XSS
- **Action**: Block requests with XSS payloads
- **Sensitivity**: Medium

**Rate Limiting:**
- **Rule**: Custom rate-based rule
- **Threshold**: 2,000 requests per 5 minutes per IP
- **Action**: Block IP for 10 minutes after threshold
- **Scope**: All API endpoints

**IP Reputation:**
- **Rule**: AWS Managed Rule Set - Known Bad Inputs
- **Action**: Block requests from known malicious IPs
- **Source**: AWS Threat Intelligence Feed

**Geographic Restrictions:**
- **Rule**: Custom geo-match rule (optional)
- **Action**: Allow only specific countries if required
- **Use Case**: Compliance with data residency requirements

#### 6.5.2 WAF Configuration

**WAF Association:**
- **CloudFront**: WAF attached to CloudFront distribution
- **ALB**: WAF attached to ALB (additional layer)
- **Logging**: WAF logs sent to S3 and CloudWatch Logs

**Custom Rules:**
- **Admin Endpoint Protection**: Stricter rate limiting for `/api/admin/*`
- **Login Protection**: CAPTCHA after 5 failed login attempts
- **API Key Validation**: Validate API keys for external integrations

### 6.6 Secrets Management

#### 6.6.1 AWS Secrets Manager

**Secrets Stored:**
- **Database Credentials**: RDS master username and password
- **JWT Signing Key**: Secret key for JWT token signing
- **Payment Gateway API Keys**: Third-party payment service credentials
- **External API Keys**: Google Maps API, analytics keys

**Secret Rotation:**
- **Database Passwords**: Automatic rotation every 30 days
- **API Keys**: Manual rotation (triggered via Secrets Manager console)
- **JWT Keys**: Rotation every 90 days (requires token re-issuance)

**Access Control:**
- **IAM Policies**: Restrict access to specific secrets
- **Resource-Based Policies**: Attach policies to secrets
- **Audit Logging**: CloudTrail logs all secret access

#### 6.6.2 Environment Variables Strategy

**ECS Task Definition:**
- **Sensitive Data**: Loaded from Secrets Manager at task startup
- **Non-Sensitive Config**: Stored in ECS task definition (environment variables)
- **Secrets Injection**: Use Secrets Manager integration with ECS

**Configuration Management:**
- **Parameter Store**: Non-sensitive configuration (feature flags, URLs)
- **Secrets Manager**: Sensitive configuration (passwords, API keys)
- **Environment-Specific**: Separate secrets for dev, staging, production

#### 6.6.3 Key Rotation Policies

**Database Password Rotation:**
- **Frequency**: Every 30 days
- **Process**: Automatic via Secrets Manager RDS integration
- **Downtime**: Zero (Secrets Manager handles rotation)
- **Application Impact**: Automatic credential refresh in connection pool

**JWT Signing Key Rotation:**
- **Frequency**: Every 90 days
- **Process**: 
  1. Generate new key, store in Secrets Manager
  2. Update application configuration
  3. Issue new tokens with new key
  4. Maintain old key for token validation (grace period: 7 days)
  5. Remove old key after grace period

**API Key Rotation:**
- **Frequency**: As needed (security incident, expiration)
- **Process**: Manual rotation via Secrets Manager console
- **Application Update**: Restart ECS tasks to load new keys

---

## 7. Operational Plan

### 7.1 CI/CD Pipeline

#### 7.1.1 Git-Based Workflow

**Repository Structure:**
- **Main Branch**: Production-ready code
- **Develop Branch**: Integration branch for features
- **Feature Branches**: Individual feature development
- **Release Branches**: Preparation for production releases

**Workflow:**
1. Developer creates feature branch from `develop`
2. Developer commits changes and opens pull request
3. Automated tests run (unit tests, integration tests)
4. Code review by team members
5. Merge to `develop` after approval
6. Automated deployment to staging environment
7. Manual testing and approval
8. Merge to `main` triggers production deployment

#### 7.1.2 Build and Test Stages

**Pipeline Stages:**

**Stage 1: Source**
- **Trigger**: Push to `main` or `develop` branch
- **Actions**: Checkout code, validate commit messages

**Stage 2: Build**
- **Actions**:
  - Install dependencies (`npm install`)
  - Build Next.js application (`npm run build`)
  - Run TypeScript type checking
  - Build Docker image
  - Push Docker image to Amazon ECR
- **Artifacts**: Docker image tag, build logs

**Stage 3: Test**
- **Unit Tests**: 
  - Run Jest test suite
  - Coverage threshold: > 80%
  - Fail pipeline if coverage drops
- **Integration Tests**:
  - Test API endpoints with test database
  - Test authentication flows
  - Test booking creation and payment flows
- **Linting**: ESLint, Prettier code formatting checks
- **Security Scanning**: 
  - npm audit (dependency vulnerabilities)
  - Snyk or GitHub Dependabot
  - Docker image scanning (Trivy)

**Stage 4: Deploy to Staging**
- **Condition**: Only if branch is `develop`
- **Actions**:
  - Update ECS service with new Docker image
  - Run smoke tests against staging environment
  - Verify health endpoints

**Stage 5: Deploy to Production**
- **Condition**: Only if branch is `main`, requires manual approval
- **Actions**:
  - Blue-green deployment strategy
  - Deploy new version alongside existing version
  - Run smoke tests
  - Gradually shift traffic (10% → 50% → 100%)
  - Rollback if errors detected

#### 7.1.3 Deployment Strategy (Blue-Green)

**Blue-Green Deployment Process:**

1. **Preparation Phase**:
   - Deploy new version (Green) alongside current version (Blue)
   - Green environment uses same infrastructure (separate ECS service)
   - Run automated smoke tests on Green

2. **Traffic Shifting**:
   - **10% Traffic**: Shift 10% of traffic to Green for 5 minutes
   - Monitor error rates, latency, CPU/memory
   - **50% Traffic**: If metrics acceptable, shift 50% traffic for 10 minutes
   - **100% Traffic**: If metrics acceptable, shift all traffic to Green

3. **Verification**:
   - Monitor CloudWatch metrics for 30 minutes
   - Check application logs for errors
   - Verify user-reported issues

4. **Rollback (if needed)**:
   - If error rate > 1% or latency > 500ms, rollback to Blue
   - Shift traffic back to Blue environment
   - Investigate issues in Green environment

5. **Cleanup**:
   - After 24 hours of stable operation, terminate Blue environment
   - Archive deployment logs and metrics

**Benefits:**
- Zero-downtime deployments
- Instant rollback capability
- Risk mitigation through gradual traffic shift
- Production-like testing before full cutover

#### 7.1.4 Infrastructure as Code (IaC)

**Terraform Configuration:**
- **VPC**: Network infrastructure (subnets, route tables, internet gateway)
- **ECS**: Cluster, service, task definitions
- **RDS**: Database instance, parameter groups, subnet groups
- **ElastiCache**: Redis cluster configuration
- **ALB**: Load balancer, target groups, listeners
- **CloudFront**: CDN distribution, cache behaviors
- **Security Groups**: Network security rules
- **IAM**: Roles and policies
- **Secrets Manager**: Secret configurations

**Terraform Workflow:**
1. **Plan**: `terraform plan` to preview changes
2. **Review**: Team review of infrastructure changes
3. **Apply**: `terraform apply` to create/update resources
4. **State Management**: Terraform state stored in S3 with DynamoDB locking

**CloudFormation Alternative:**
- **Use Case**: AWS-native IaC, simpler for AWS-only deployments
- **Templates**: JSON or YAML CloudFormation templates
- **Stack Management**: AWS CloudFormation console or CLI

**Version Control:**
- **Infrastructure Code**: Stored in Git repository
- **State Files**: Encrypted in S3, versioned
- **Change Management**: Infrastructure changes require pull request approval

### 7.2 Monitoring & Alerting

#### 7.2.1 CloudWatch Metrics

**Application Metrics:**
- **Request Count**: Total requests per minute
- **Request Rate**: Requests per second
- **Error Rate**: 4xx and 5xx errors percentage
- **Latency**: p50, p95, p99 response times
- **Active Connections**: Current database connections

**Infrastructure Metrics:**
- **ECS**: CPU utilization, memory utilization, task count
- **RDS**: CPU utilization, memory utilization, connection count, read/write IOPS
- **ElastiCache**: CPU utilization, memory utilization, cache hit rate
- **ALB**: Request count, target response time, healthy/unhealthy target count
- **CloudFront**: Request count, cache hit rate, error rate

**Custom Metrics:**
- **Booking Creation Rate**: Bookings created per minute
- **Payment Success Rate**: Successful payments percentage
- **Slot Occupancy Rate**: Percentage of occupied slots
- **Active Users**: Concurrent active users

#### 7.2.2 CloudWatch Logs

**Log Groups:**
- **Application Logs**: `/aws/ecs/smart-parking/app`
- **Access Logs**: `/aws/alb/smart-parking/access`
- **WAF Logs**: `/aws/waf/smart-parking`
- **Database Logs**: `/aws/rds/smart-parking/postgresql`

**Log Retention:**
- **Application Logs**: 30 days (CloudWatch Logs)
- **Access Logs**: 90 days (S3)
- **Audit Logs**: 365 days (S3, archived to Glacier)

**Log Aggregation:**
- **CloudWatch Logs Insights**: Query logs using SQL-like syntax
- **Log Filters**: Filter logs by severity, source, timestamp
- **Log Streaming**: Stream logs to external SIEM if needed

#### 7.2.3 Custom Dashboards

**Operational Dashboard:**
- **System Health**: Overall system status (green/yellow/red)
- **Request Metrics**: Request rate, error rate, latency
- **Resource Utilization**: CPU, memory, database connections
- **Active Alarms**: Current active CloudWatch alarms

**Business Metrics Dashboard:**
- **User Activity**: Daily active users, new registrations
- **Booking Metrics**: Bookings created, completed, cancelled
- **Revenue Metrics**: Payment transactions, revenue per day
- **Occupancy Metrics**: Slot occupancy rate, peak hours

**Security Dashboard:**
- **Failed Login Attempts**: Authentication failures per hour
- **WAF Blocked Requests**: Blocked requests by rule type
- **API Abuse**: Rate limit violations, suspicious patterns

#### 7.2.4 Alert Thresholds and Notifications

**Critical Alerts (Immediate Response):**
- **Service Down**: Error rate > 5% for 2 minutes → PagerDuty/SMS
- **Database Down**: RDS instance unavailable → PagerDuty/SMS
- **High Error Rate**: Error rate > 1% for 5 minutes → Email/Slack
- **High Latency**: p95 latency > 500ms for 5 minutes → Email/Slack

**Warning Alerts (Investigation Required):**
- **CPU High**: CPU utilization > 80% for 10 minutes → Email
- **Memory High**: Memory utilization > 85% for 10 minutes → Email
- **Database Connections**: Connection count > 80% of max → Email
- **Cache Hit Rate Low**: Cache hit rate < 70% for 15 minutes → Email

**Info Alerts (Monitoring):**
- **Deployment**: Successful deployment notification → Slack
- **Scaling Events**: ECS autoscaling events → Slack
- **Backup Completion**: Daily backup completion → Email

**Notification Channels:**
- **PagerDuty**: Critical alerts for on-call engineers
- **Slack**: Team notifications, deployment updates
- **Email**: Non-critical alerts, daily summaries
- **SMS**: Critical alerts during business hours

#### 7.2.5 Application Performance Monitoring (APM)

**APM Tool: AWS X-Ray**
- **Distributed Tracing**: Trace requests across services
- **Service Map**: Visualize service dependencies
- **Performance Analysis**: Identify bottlenecks and slow queries

**Instrumentation:**
- **ECS Tasks**: X-Ray daemon running as sidecar container
- **API Routes**: X-Ray SDK for Node.js
- **Database Queries**: Trace slow queries (> 100ms)
- **External APIs**: Trace payment gateway calls

**Key Metrics:**
- **Trace Duration**: End-to-end request time
- **Service Latency**: Time spent in each service
- **Error Rate**: Failed traces percentage
- **Throughput**: Traces per second

### 7.3 Runbooks for Incidents

#### 7.3.1 Service Outage Procedures

**Incident: Complete Service Unavailability**

**Symptoms:**
- All API endpoints returning 5xx errors
- CloudWatch shows 100% error rate
- Users cannot access application

**Investigation Steps:**
1. Check CloudWatch dashboards for system health
2. Verify ECS service status (are tasks running?)
3. Check ALB target health (are targets healthy?)
4. Review RDS instance status (is database available?)
5. Check recent deployments (was there a recent change?)
6. Review application logs for errors

**Recovery Steps:**
1. **If ECS Tasks Failed**:
   - Check ECS service events for error messages
   - Review task logs in CloudWatch
   - Restart ECS service if needed
   - Verify tasks pass health checks

2. **If Database Unavailable**:
   - Check RDS instance status in console
   - Verify Multi-AZ failover status
   - Check database connection limits
   - Restore from snapshot if corruption detected

3. **If ALB Issues**:
   - Verify ALB target group health
   - Check security group rules
   - Verify SSL certificate validity
   - Review ALB access logs

4. **Rollback if Recent Deployment**:
   - Identify last successful deployment
   - Rollback to previous Docker image
   - Verify service restoration

**Communication:**
- Update status page within 5 minutes
- Notify team via Slack/PagerDuty
- Post updates every 15 minutes until resolved
- Post-mortem within 48 hours

#### 7.3.2 Database Performance Issues

**Incident: Slow Database Queries**

**Symptoms:**
- High database CPU utilization (> 80%)
- Slow API response times (> 1 second)
- Database connection pool exhaustion
- CloudWatch shows high database latency

**Investigation Steps:**
1. Check RDS Performance Insights for slow queries
2. Review database connection count
3. Analyze query execution plans
4. Check for missing indexes
5. Review database logs for errors

**Recovery Steps:**
1. **Identify Slow Queries**:
   - Use Performance Insights to identify top queries
   - Review query execution plans
   - Check for full table scans

2. **Optimize Queries**:
   - Add missing indexes
   - Rewrite inefficient queries
   - Enable query result caching in Redis

3. **Scale Database**:
   - If CPU-bound: Scale up instance size
   - If read-heavy: Add read replica
   - If connection-bound: Increase max connections

4. **Emergency Actions**:
   - Kill long-running queries if needed
   - Restart database if necessary (with maintenance window)
   - Enable read replicas for read traffic

**Prevention:**
- Regular query performance reviews
- Index optimization
- Connection pool tuning
- Database monitoring alerts

#### 7.3.3 Payment Gateway Failures

**Incident: Payment Processing Failures**

**Symptoms:**
- Payment API returning errors
- Users unable to complete bookings
- High error rate on `/api/payments` endpoint
- External API timeout errors

**Investigation Steps:**
1. Check payment gateway status page
2. Review application logs for payment API errors
3. Verify API credentials (Secrets Manager)
4. Check network connectivity (NAT Gateway)
5. Review rate limiting (are we hitting limits?)

**Recovery Steps:**
1. **If Payment Gateway Down**:
   - Check third-party status page
   - Implement graceful error handling
   - Queue failed payments for retry
   - Notify users of temporary unavailability

2. **If API Credentials Invalid**:
   - Verify secrets in Secrets Manager
   - Rotate API keys if compromised
   - Update application configuration
   - Restart ECS tasks

3. **If Rate Limited**:
   - Implement exponential backoff
   - Reduce request frequency
   - Contact payment gateway support
   - Consider multiple API keys for load distribution

4. **Fallback Strategy**:
   - Allow bookings without immediate payment
   - Queue payments for later processing
   - Notify users of payment delay
   - Process queued payments when gateway recovers

**Communication:**
- Update users via in-app notification
- Post status update on website
- Notify business stakeholders
- Document incident for review

#### 7.3.4 Security Incidents

**Incident: Suspected Security Breach**

**Symptoms:**
- Unusual authentication failures
- Suspicious API access patterns
- WAF blocking high volume of requests
- Unauthorized access attempts

**Investigation Steps:**
1. Review CloudTrail logs for unauthorized access
2. Check WAF logs for attack patterns
3. Analyze failed login attempts
4. Review IAM access logs
5. Check for data exfiltration patterns

**Immediate Actions:**
1. **Containment**:
   - Block suspicious IP addresses in WAF
   - Revoke compromised credentials
   - Isolate affected resources if needed

2. **Investigation**:
   - Preserve logs and evidence
   - Identify attack vector
   - Assess data exposure
   - Document timeline of events

3. **Remediation**:
   - Rotate all credentials (database, API keys, JWT keys)
   - Patch vulnerabilities
   - Update security rules
   - Enhance monitoring

4. **Notification**:
   - Notify security team immediately
   - Report to compliance if data breach
   - Notify affected users if personal data exposed
   - File incident report

**Post-Incident:**
- Conduct security review
- Update security policies
- Enhance monitoring and alerting
- Security training for team

---

## 8. Cost Estimate & Optimization

### 8.1 Baseline Workload Cost Breakdown

**Assumptions:**
- Region: US East (N. Virginia) - us-east-1
- Monthly operating hours: 730 hours
- Data transfer: 1 TB/month outbound
- Storage growth: 10% per month

#### 8.1.1 Compute Costs (ECS Fargate)

**Baseline Configuration:**
- Tasks: 3 tasks (minimum for high availability)
- CPU: 0.5 vCPU per task
- Memory: 1 GB per task
- Average tasks per month: 5 (accounts for autoscaling)

**Cost Calculation:**
- vCPU cost: $0.04048 per vCPU-hour
- Memory cost: $0.004445 per GB-hour
- Per task cost: (0.5 × $0.04048) + (1 × $0.004445) = $0.024685 per hour
- 3 tasks baseline: 3 × $0.024685 × 730 = $54.06/month
- 5 tasks average (with autoscaling): 5 × $0.024685 × 730 = $90.10/month

**Total ECS Cost: ~$90/month**

#### 8.1.2 Database Costs (RDS PostgreSQL)

**Configuration:**
- Instance: db.t3.medium (Multi-AZ)
- Storage: 100 GB General Purpose SSD (gp3)
- Backup storage: 50 GB (7-day retention)
- Data transfer: Included in instance

**Cost Calculation:**
- Instance (Multi-AZ): $0.136 × 2 × 730 = $198.56/month
- Storage (gp3): 100 GB × $0.115 = $11.50/month
- Backup storage: 50 GB × $0.095 = $4.75/month
- IOPS: 3,000 IOPS included (baseline 3,000 IOPS)

**Total RDS Cost: ~$215/month**

#### 8.1.3 Cache Costs (ElastiCache Redis)

**Configuration:**
- Node type: cache.t3.micro
- Memory: 0.5 GB
- Data transfer: Included

**Cost Calculation:**
- Node cost: $0.017 × 730 = $12.41/month

**Total ElastiCache Cost: ~$12/month**

#### 8.1.4 Storage Costs (S3)

**Configuration:**
- Static assets: 50 MB
- Application logs: 9 GB (90-day retention)
- RDS snapshots: 35 GB
- Total: ~50 GB

**Cost Calculation:**
- Standard storage: 50 GB × $0.023 = $1.15/month
- PUT requests: 10,000 × $0.005 / 1,000 = $0.05/month
- GET requests: 100,000 × $0.0004 / 1,000 = $0.04/month

**Total S3 Cost: ~$1.25/month**

#### 8.1.5 CDN Costs (CloudFront)

**Configuration:**
- Data transfer out: 500 GB/month
- Requests: 15 million/month

**Cost Calculation:**
- First 10 TB: $0.085 per GB
- Data transfer: 500 GB × $0.085 = $42.50/month
- HTTP/HTTPS requests: 15M × $0.0075 / 10,000 = $11.25/month

**Total CloudFront Cost: ~$54/month**

#### 8.1.6 Networking Costs

**Application Load Balancer (ALB):**
- ALB hours: $0.0225 × 730 = $16.43/month
- LCU (Load Balancer Capacity Units): ~50 LCU-hours × $0.008 = $0.40/month
- **Total ALB Cost: ~$17/month**

**NAT Gateway:**
- NAT Gateway hours: $0.045 × 730 × 3 AZs = $98.55/month
- Data processing: 500 GB × $0.045 = $22.50/month
- **Total NAT Gateway Cost: ~$121/month**

**VPC Endpoints (for S3/Secrets Manager):**
- VPC endpoint: $0.01 × 730 = $7.30/month
- Data processing: Minimal (intra-region)
- **Total VPC Endpoint Cost: ~$7/month**

**Total Networking Cost: ~$145/month**

#### 8.1.7 Monitoring Costs (CloudWatch)

**Configuration:**
- Custom metrics: 20 metrics
- Log ingestion: 5 GB/month
- Dashboards: 3 dashboards

**Cost Calculation:**
- Custom metrics: 20 × $0.30 = $6.00/month
- Log ingestion: 5 GB × $0.50 = $2.50/month
- Dashboards: 3 × $3.00 = $9.00/month
- Alarms: 15 alarms × $0.10 = $1.50/month

**Total CloudWatch Cost: ~$19/month**

#### 8.1.8 Security Costs

**AWS WAF:**
- Web ACL: $5.00/month
- Rules: 10 rules × $1.00 = $10.00/month
- Requests: 10M × $0.60 / 1M = $6.00/month

**AWS Secrets Manager:**
- Secrets: 5 secrets × $0.40 = $2.00/month

**Total Security Cost: ~$23/month**

#### 8.1.9 Total Baseline Cost Summary

| Component | Monthly Cost |
|-----------|--------------|
| ECS Fargate | $90 |
| RDS PostgreSQL | $215 |
| ElastiCache Redis | $12 |
| S3 Storage | $1 |
| CloudFront CDN | $54 |
| Networking (ALB, NAT, VPC) | $145 |
| CloudWatch Monitoring | $19 |
| Security (WAF, Secrets) | $23 |
| **Total** | **~$560/month** |

**Annual Cost: ~$6,720/year**

### 8.2 Optimization Option 1: Reserved Instances & Right-Sizing

#### 8.2.1 Reserved Instances Strategy

**ECS Fargate Savings Plans:**
- **Commitment**: 1-year, $0 upfront
- **Savings**: ~17% discount
- **ECS Cost Reduction**: $90 × 0.17 = $15.30/month savings

**RDS Reserved Instances:**
- **Instance**: db.t3.medium Multi-AZ
- **Term**: 1-year, partial upfront
- **Savings**: ~30% discount
- **RDS Cost Reduction**: $215 × 0.30 = $64.50/month savings

**Total Reserved Instance Savings: ~$80/month**

#### 8.2.2 Right-Sizing Recommendations

**ECS Task Optimization:**
- **Current**: 0.5 vCPU, 1 GB RAM
- **Analysis**: Average CPU utilization ~40%, memory ~60%
- **Recommendation**: Maintain current sizing (appropriate for workload)
- **Potential Savings**: None (already right-sized)

**RDS Optimization:**
- **Current**: db.t3.medium (2 vCPU, 4 GB RAM)
- **Analysis**: Average CPU ~50%, memory ~60%
- **Recommendation**: Consider db.t3.small for non-peak hours (not feasible with Multi-AZ)
- **Alternative**: Use scheduled scaling (not supported for RDS)
- **Potential Savings**: Minimal (current sizing appropriate)

**ElastiCache Optimization:**
- **Current**: cache.t3.micro (0.5 GB)
- **Analysis**: Memory utilization ~70%
- **Recommendation**: Monitor, scale up if cache hit rate drops
- **Potential Savings**: None (appropriate sizing)

#### 8.2.3 Cost Optimization Actions

1. **Enable ECS Fargate Savings Plans**: 1-year commitment
2. **Purchase RDS Reserved Instances**: 1-year term
3. **Optimize NAT Gateway**: Use VPC endpoints for S3/Secrets Manager (reduce NAT data transfer)
4. **S3 Lifecycle Policies**: Move old logs to Intelligent-Tiering or Glacier

**Estimated Monthly Savings: ~$85/month**
**Optimized Monthly Cost: ~$475/month**

### 8.3 Optimization Option 2: Aggressive Caching & Serverless Alternatives

#### 8.3.1 Aggressive Caching Strategy

**Enhanced Redis Caching:**
- **Current Cache Hit Rate**: ~70%
- **Target Cache Hit Rate**: > 90%
- **Actions**:
  - Increase TTL for location metadata (1 hour → 4 hours)
  - Cache booking queries (5 minutes → 15 minutes)
  - Implement cache warming for frequently accessed data

**Impact:**
- **Database Load Reduction**: 30% reduction in database queries
- **RDS Cost**: Could potentially use smaller instance (not recommended for Multi-AZ)
- **ElastiCache Cost**: Scale to cache.t3.small ($24/month) for better performance
- **Net Savings**: Minimal direct cost savings, but improves performance

#### 8.3.2 Serverless Alternatives

**API Gateway + Lambda for Low-Traffic Endpoints:**
- **Endpoints**: Admin analytics, reporting APIs
- **Current Cost**: Included in ECS
- **Lambda Cost**: 
  - Requests: 100,000/month × $0.20 / 1M = $0.02/month
  - Compute: 1M GB-seconds × $0.0000166667 = $16.67/month
- **Savings**: Minimal (admin endpoints are low-traffic)

**S3 + CloudFront for Static Assets:**
- **Already Implemented**: No additional savings

**Aurora Serverless v2 (Alternative to RDS):**
- **Use Case**: Variable workload, cost optimization
- **Cost**: Pay per ACU (Aurora Capacity Unit) hour
- **Analysis**: For consistent workload, RDS is more cost-effective
- **Recommendation**: Not recommended for current workload

#### 8.3.3 Cost-Effective Storage Tiers

**S3 Intelligent-Tiering:**
- **Current**: Standard storage
- **Optimization**: Enable Intelligent-Tiering for logs and backups
- **Savings**: ~40% on infrequently accessed data
- **Monthly Savings**: ~$0.50/month (minimal impact)

**S3 Glacier for Long-Term Backups:**
- **Use Case**: RDS snapshots older than 30 days
- **Savings**: ~70% compared to Standard storage
- **Monthly Savings**: ~$2/month

**CloudWatch Logs Retention:**
- **Current**: 30 days
- **Optimization**: Reduce to 14 days, archive to S3
- **Savings**: ~50% reduction in CloudWatch Logs cost
- **Monthly Savings**: ~$1.25/month

#### 8.3.4 Cost Optimization Actions

1. **Enhance Caching**: Increase cache hit rate to > 90%
2. **S3 Lifecycle Policies**: Move old data to Intelligent-Tiering/Glacier
3. **Reduce CloudWatch Retention**: Archive logs to S3 after 14 days
4. **Optimize NAT Gateway**: Use VPC endpoints (already included in Option 1)

**Estimated Monthly Savings: ~$10/month**
**Optimized Monthly Cost: ~$550/month**

**Note**: Option 2 provides minimal cost savings but improves performance and operational efficiency.

### 8.4 Cost Control Measures

#### 8.4.1 Budget Alerts

**AWS Budgets Configuration:**
- **Monthly Budget**: $600 (with 10% buffer)
- **Alert Thresholds**:
  - 50% of budget: $300 → Email alert
  - 80% of budget: $480 → Email + Slack alert
  - 100% of budget: $600 → Email + Slack + SMS alert
  - 120% of budget: $720 → Critical alert

**Budget Tracking:**
- **Forecasted Cost**: AWS Cost Explorer forecasts
- **Daily Cost Reports**: Automated daily cost summaries
- **Anomaly Detection**: AWS Cost Anomaly Detection for unexpected spikes

#### 8.4.2 Resource Tagging

**Tagging Strategy:**
- **Environment**: `prod`, `staging`, `dev`
- **Project**: `smart-parking`
- **Cost Center**: `engineering`
- **Owner**: Team email

**Cost Allocation:**
- Track costs by environment (prod vs. non-prod)
- Identify cost drivers by service
- Optimize based on tagged resources

#### 8.4.3 Scheduled Shutdowns for Non-Prod

**Staging Environment:**
- **Schedule**: Shutdown nights/weekends (6 PM - 8 AM, weekends)
- **Savings**: ~60% reduction in staging costs
- **Monthly Savings**: ~$50/month (if staging environment exists)

**Development Environment:**
- **Schedule**: Shutdown when not in use
- **Savings**: ~80% reduction in dev costs
- **Monthly Savings**: ~$30/month (if dev environment exists)

**Total Non-Prod Savings: ~$80/month** (if non-prod environments exist)

---

## 9. Testing Strategy

### 9.1 Functional Testing

#### 9.1.1 Unit Tests

**Scope:**
- API route handlers (`/api/auth/*`, `/api/bookings`, `/api/locations`)
- Business logic functions (booking creation, slot availability)
- Utility functions (token generation, validation)

**Tools:**
- **Framework**: Jest
- **Coverage Target**: > 80% code coverage
- **Execution**: Run in CI/CD pipeline on every commit

**Test Cases:**

**Authentication Tests:**
- Valid login credentials → Success response with token
- Invalid credentials → 401 Unauthorized
- Missing fields → 400 Bad Request
- Token validation → Valid/Invalid token handling

**Booking Tests:**
- Create booking with valid data → Booking created
- Create booking for occupied slot → 409 Conflict
- Create booking with invalid location → 404 Not Found
- Update booking payment status → Status updated

**Test Example:**
```typescript
describe('POST /api/bookings', () => {
  it('should create a booking for available slot', async () => {
    const response = await request(app)
      .post('/api/bookings')
      .send({
        userEmail: 'user@example.com',
        locationId: 'loc_1',
        slotNumber: 1
      });
    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('id');
  });
});
```

#### 9.1.2 Integration Tests

**Scope:**
- End-to-end API flows (login → browse locations → create booking → payment)
- Database interactions (CRUD operations)
- Cache interactions (Redis read/write)
- External API integrations (payment gateway)

**Tools:**
- **Framework**: Jest with Supertest
- **Test Database**: Separate test RDS instance or Docker PostgreSQL
- **Test Cache**: Separate test Redis instance

**Test Scenarios:**

**User Journey Tests:**
1. User registration → Login → Browse locations → View slots → Create booking → Payment → View booking
2. Admin login → View all bookings → Update slot status → View analytics

**API Integration Tests:**
- Database connection and query execution
- Cache read/write operations
- Error handling and rollback scenarios
- Concurrent request handling

**Test Execution:**
- Run in CI/CD pipeline before deployment
- Use test database with seed data
- Clean up test data after each test suite

#### 9.1.3 User Acceptance Testing (UAT)

**Scope:**
- End-to-end user workflows from browser
- UI/UX validation
- Cross-browser compatibility
- Mobile responsiveness

**Tools:**
- **Framework**: Playwright or Cypress
- **Browsers**: Chrome, Firefox, Safari, Edge
- **Devices**: Desktop, Tablet, Mobile

**Test Scenarios:**

**User Workflows:**
1. User finds parking location → Books slot → Completes payment → Receives confirmation
2. User views booking history → Cancels booking → Receives refund confirmation
3. Admin manages locations → Updates slot availability → Views occupancy reports

**UAT Criteria:**
- All critical user journeys complete successfully
- No critical bugs or usability issues
- Performance meets acceptance criteria (< 3s page load)
- Accessibility standards met (WCAG 2.1 AA)

### 9.2 Load Testing

#### 9.2.1 Load Testing Tools

**Tool Selection: k6**
- **Rationale**: Modern, developer-friendly, cloud-native
- **Alternatives Considered**: 
  - JMeter: More complex, GUI-based
  - Artillery: Good alternative, chose k6 for better scripting
  - Locust: Python-based, good for complex scenarios

**Tool Configuration:**
- **Scripting**: JavaScript (k6 scripts)
- **Metrics**: Response time, throughput, error rate
- **Reporting**: CloudWatch integration, HTML reports

#### 9.2.2 Test Scenarios

**Baseline Load Test:**
- **Load**: 33 RPS (actual peak, 1× baseline)
- **Duration**: 15 minutes
- **Users**: 100 virtual users
- **Ramp-up**: 0 to 100 users over 2 minutes
- **Purpose**: Validate baseline performance

**Peak Load Test:**
- **Load**: 100 RPS (3× safety margin)
- **Duration**: 30 minutes
- **Users**: 300 virtual users
- **Ramp-up**: 0 to 300 users over 5 minutes
- **Purpose**: Validate system handles peak load

**Stress Test:**
- **Load**: 200 RPS (6× baseline, beyond expected peak)
- **Duration**: 15 minutes
- **Users**: 600 virtual users
- **Ramp-up**: 0 to 600 users over 10 minutes
- **Purpose**: Identify breaking point and failure modes

**Endurance Test:**
- **Load**: 50 RPS (sustained load)
- **Duration**: 2 hours
- **Users**: 150 virtual users
- **Purpose**: Identify memory leaks, resource exhaustion

#### 9.2.3 Success Criteria

**Performance Criteria:**
- **Response Time**: p95 < 300ms (baseline and peak tests)
- **Error Rate**: < 1% (baseline and peak tests)
- **Throughput**: System handles target RPS without degradation
- **Resource Utilization**: CPU < 80%, Memory < 85%

**Load Test Pass Criteria:**
- ✅ Baseline test: All criteria met
- ✅ Peak test: All criteria met
- ⚠️ Stress test: Error rate < 5% acceptable (expected degradation)
- ✅ Endurance test: No memory leaks, stable performance

**Failure Criteria:**
- ❌ Error rate > 1% in baseline/peak tests
- ❌ p95 latency > 500ms in baseline/peak tests
- ❌ System unavailability during test
- ❌ Database connection pool exhaustion

#### 9.2.4 Load Test Execution

**Test Environment:**
- **Infrastructure**: Production-like environment (staging)
- **Data**: Realistic test data (10,000 users, 50 locations)
- **Monitoring**: CloudWatch metrics, APM tracing enabled

**Test Execution Process:**
1. **Pre-Test**: Verify test environment, seed test data
2. **Warm-up**: Run low load (10 RPS) for 5 minutes
3. **Ramp-up**: Gradually increase load to target
4. **Sustained Load**: Maintain target load for duration
5. **Ramp-down**: Gradually decrease load
6. **Analysis**: Review metrics, identify bottlenecks

**k6 Test Script Example:**
```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 100 }, // Ramp-up
    { duration: '15m', target: 100 }, // Sustained load
    { duration: '2m', target: 0 }, // Ramp-down
  ],
  thresholds: {
    http_req_duration: ['p(95)<300'], // 95% of requests < 300ms
    http_req_failed: ['rate<0.01'], // Error rate < 1%
  },
};

export default function () {
  const response = http.get('https://api.example.com/api/locations');
  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 300ms': (r) => r.timings.duration < 300,
  });
  sleep(1);
}
```

### 9.3 Chaos/Fault Injection Testing

#### 9.3.1 Test Scenarios

**Scenario 1: ECS Task Termination**
- **Test**: Randomly terminate ECS tasks during load test
- **Expected Behavior**: 
  - ALB routes traffic away from terminated tasks
  - ECS automatically starts replacement tasks
  - No user-visible errors (requests handled by remaining tasks)
- **Recovery Time**: < 5 minutes for task replacement
- **Pass Criteria**: Error rate < 2% during termination, automatic recovery

**Scenario 2: Database Failover**
- **Test**: Simulate RDS primary instance failure (manual failover)
- **Expected Behavior**:
  - RDS automatically promotes standby to primary
  - Application reconnects using connection pool
  - Brief increase in latency (< 5 seconds)
  - No data loss
- **Recovery Time**: < 2 minutes (RDS Multi-AZ failover)
- **Pass Criteria**: Zero data loss, automatic failover, recovery < 2 minutes

**Scenario 3: Network Latency Injection**
- **Test**: Inject network latency (100ms, 500ms, 1000ms) between services
- **Expected Behavior**:
  - Application handles latency gracefully
  - Timeout errors for excessive latency (> 5 seconds)
  - Retry logic for transient failures
- **Pass Criteria**: Application remains functional, appropriate error handling

**Scenario 4: Dependency Failures**
- **Test**: Simulate payment gateway timeout/failure
- **Expected Behavior**:
  - Graceful error handling
  - User receives appropriate error message
  - Failed payments queued for retry
  - No data corruption
- **Pass Criteria**: No application crashes, proper error handling, retry mechanism works

**Scenario 5: Cache Failure**
- **Test**: Simulate ElastiCache unavailability
- **Expected Behavior**:
  - Application falls back to direct database queries
  - Increased database load (acceptable)
  - No user-visible errors
  - Performance degradation acceptable (< 2× latency)
- **Pass Criteria**: Application remains functional, graceful degradation

#### 9.3.2 Expected Behavior and Recovery

**Chaos Engineering Principles:**
- **Hypothesis**: System should handle failures gracefully
- **Blast Radius**: Limit impact to test environment
- **Automation**: Automated chaos tests in CI/CD
- **Observability**: Comprehensive monitoring during tests

**Recovery Validation:**
- **Automatic Recovery**: System recovers without manual intervention
- **Data Integrity**: No data loss or corruption
- **Service Availability**: Service remains available (may degrade gracefully)
- **User Impact**: Minimal user-visible errors

#### 9.3.3 Pass/Fail Criteria

**Chaos Test Pass Criteria:**
- ✅ System handles failure gracefully (no crashes)
- ✅ Automatic recovery within expected timeframes
- ✅ Error rate < 5% during failure scenarios
- ✅ Data integrity maintained (no data loss)
- ✅ Monitoring and alerting function correctly

**Chaos Test Fail Criteria:**
- ❌ System crashes or becomes unavailable
- ❌ Data loss or corruption
- ❌ Manual intervention required for recovery
- ❌ Error rate > 10% during failure scenarios
- ❌ Recovery time exceeds RTO (30 minutes)

**Chaos Testing Tools:**
- **AWS Fault Injection Simulator (FIS)**: Inject failures in AWS services
- **Chaos Monkey**: Randomly terminate instances
- **Custom Scripts**: Simulate specific failure scenarios

---

## 10. Risk Register & Mitigation Plan

### 10.1 Risk Assessment Methodology

**Risk Scoring:**
- **Impact**: High (H), Medium (M), Low (L)
- **Likelihood**: High (H), Medium (M), Low (L)
- **Risk Level**: High (H×H, H×M), Medium (M×M, H×L, M×H), Low (L×L, M×L, L×H)

**Mitigation Priority:**
- **High Risk**: Immediate mitigation required
- **Medium Risk**: Mitigation planned within 30 days
- **Low Risk**: Mitigation planned within 90 days

### 10.2 Top 8 Risks

#### Risk 1: Database Bottleneck/Performance Degradation

**Description:**
The RDS PostgreSQL database may become a performance bottleneck as traffic grows, leading to slow query responses, connection pool exhaustion, and degraded user experience.

**Impact Assessment:** High
- User experience degradation (slow page loads)
- Potential service unavailability if database overloaded
- Revenue impact (users unable to complete bookings)

**Likelihood:** Medium
- Current workload manageable, but growth may exceed capacity
- Complex queries or missing indexes could cause issues

**Mitigation Strategies:**
1. **Database Optimization:**
   - Regular query performance analysis using Performance Insights
   - Index optimization based on query patterns
   - Query result caching in Redis
   - Connection pool tuning

2. **Scaling Strategy:**
   - Vertical scaling: Scale up to db.t3.large or db.t3.xlarge if CPU-bound
   - Horizontal scaling: Add read replicas for read-heavy workloads
   - Consider Aurora PostgreSQL for better scalability

3. **Monitoring:**
   - CloudWatch alarms for CPU, memory, connection count
   - Performance Insights for slow query identification
   - Proactive alerting before issues impact users

**Contingency Plan:**
- Emergency scale-up of database instance
- Temporarily reduce non-critical features to reduce database load
- Enable read replicas for immediate read load distribution

**Risk Level:** Medium (M×H)

---

#### Risk 2: Security Misconfigurations (IAM, Security Groups)

**Description:**
Misconfigured IAM roles, security groups, or network ACLs could expose the system to unauthorized access, data breaches, or compliance violations.

**Impact Assessment:** High
- Data breach (user data, payment information)
- Unauthorized access to admin functions
- Compliance violations (GDPR, data protection regulations)
- Reputation damage

**Likelihood:** Medium
- Complex IAM policies increase risk of misconfiguration
- Security group rules may be too permissive
- Human error in configuration changes

**Mitigation Strategies:**
1. **Infrastructure as Code:**
   - All IAM roles and security groups defined in Terraform
   - Version control for security configurations
   - Peer review required for security-related changes

2. **Security Audits:**
   - Regular security audits using AWS Security Hub
   - Automated compliance checks (CIS AWS Foundations Benchmark)
   - Penetration testing quarterly

3. **Least Privilege:**
   - IAM roles with minimal required permissions
   - Security groups with specific source IPs/security groups
   - Regular access reviews and permission cleanup

4. **Automated Scanning:**
   - AWS Config for compliance monitoring
   - CloudTrail for access auditing
   - Automated alerts for security policy violations

**Contingency Plan:**
- Immediate revocation of compromised credentials
- Isolate affected resources
- Security incident response procedure
- Notify affected users if data breach confirmed

**Risk Level:** High (H×M)

---

#### Risk 3: Cost Overruns

**Description:**
Unexpected cost increases due to traffic spikes, misconfigured autoscaling, or inefficient resource utilization could exceed budget.

**Impact Assessment:** Medium
- Budget overruns impact project viability
- Potential service degradation if forced to reduce resources
- Stakeholder concerns

**Likelihood:** Medium
- Autoscaling may scale beyond expected limits
- Traffic spikes during promotions or events
- Inefficient resource utilization

**Mitigation Strategies:**
1. **Cost Monitoring:**
   - AWS Budgets with alerts at 50%, 80%, 100%, 120%
   - Daily cost reports via Cost Explorer
   - Cost anomaly detection for unexpected spikes

2. **Autoscaling Limits:**
   - Maximum task count limits (10 tasks)
   - Maximum database instance size limits
   - Scheduled scaling to reduce costs during low-traffic periods

3. **Resource Optimization:**
   - Regular right-sizing reviews
   - Reserved Instances/Savings Plans for predictable workloads
   - S3 lifecycle policies for cost optimization

4. **Cost Controls:**
   - Resource tagging for cost allocation
   - Approval process for resource increases
   - Regular cost reviews and optimization

**Contingency Plan:**
- Immediate cost review and optimization
- Scale down non-critical resources
- Enable cost-saving features (S3 Intelligent-Tiering)
- Consider Reserved Instances for immediate savings

**Risk Level:** Medium (M×M)

---

#### Risk 4: DDoS Attacks

**Description:**
Distributed Denial of Service (DDoS) attacks could overwhelm the system, causing service unavailability and impacting legitimate users.

**Impact Assessment:** High
- Complete service unavailability
- User experience degradation
- Potential revenue loss
- Reputation damage

**Likelihood:** Low
- Parking management system not high-profile target
- AWS WAF and Shield provide protection
- However, attacks are unpredictable

**Mitigation Strategies:**
1. **AWS Shield:**
   - AWS Shield Standard (included) for basic DDoS protection
   - Consider AWS Shield Advanced for enhanced protection
   - Automatic DDoS mitigation

2. **WAF Rules:**
   - Rate limiting rules (2,000 requests per 5 minutes per IP)
   - Geographic restrictions if needed
   - IP reputation-based blocking

3. **Autoscaling:**
   - ECS autoscaling to handle legitimate traffic spikes
   - However, DDoS attacks may exceed scaling limits

4. **Monitoring:**
   - CloudWatch alarms for unusual traffic patterns
   - WAF logs analysis for attack detection
   - Real-time alerting for DDoS events

**Contingency Plan:**
- Enable AWS Shield Advanced for enhanced protection
- Block malicious IPs in WAF
- Scale up resources temporarily (if legitimate traffic)
- Contact AWS Support for DDoS mitigation assistance

**Risk Level:** Medium (H×L)

---

#### Risk 5: Data Loss/Corruption

**Description:**
Data loss or corruption due to database failures, accidental deletions, or backup failures could result in permanent data loss.

**Impact Assessment:** High
- Permanent loss of user data, bookings, payment records
- Business continuity impact
- Compliance violations
- User trust damage

**Likelihood:** Low
- RDS automated backups and Multi-AZ provide protection
- However, human error or backup failures possible

**Mitigation Strategies:**
1. **Automated Backups:**
   - RDS automated daily backups (7-day retention)
   - Point-in-time recovery enabled (5-minute granularity)
   - Cross-region backup replication (optional)

2. **Multi-AZ Deployment:**
   - RDS Multi-AZ for automatic failover
   - Synchronous replication (zero data loss)

3. **Backup Verification:**
   - Regular backup restoration tests
   - Verify backup integrity
   - Test recovery procedures

4. **Access Controls:**
   - Restricted database access (admin only)
   - Audit logging for all database changes
   - Approval process for data deletion

**Contingency Plan:**
- Immediate restoration from latest backup
- Point-in-time recovery to before corruption
- Data recovery from cross-region backups if needed
- Notify users if data loss confirmed

**Risk Level:** Medium (H×L)

---

#### Risk 6: Service Availability Issues

**Description:**
Extended service outages due to infrastructure failures, deployment issues, or third-party dependencies could impact user access.

**Impact Assessment:** High
- User inability to access service
- Revenue loss
- User frustration and churn
- Reputation damage

**Likelihood:** Medium
- Multi-AZ deployment reduces risk
- However, deployment errors or regional outages possible

**Mitigation Strategies:**
1. **High Availability:**
   - Multi-AZ deployment for all critical services
   - ECS tasks distributed across 3 AZs
   - RDS Multi-AZ for database redundancy

2. **Health Checks:**
   - Comprehensive health checks for all services
   - Automatic failover mechanisms
   - Self-healing infrastructure

3. **Deployment Strategy:**
   - Blue-green deployments for zero-downtime
   - Gradual traffic shifting
   - Automated rollback on errors

4. **Monitoring:**
   - Real-time monitoring and alerting
   - Proactive issue detection
   - On-call rotation for incident response

**Contingency Plan:**
- Immediate incident response procedure
- Rollback to previous deployment version
- Scale up resources if capacity issue
- Communicate status updates to users

**Risk Level:** Medium (H×M)

---

#### Risk 7: Scalability Limitations

**Description:**
The current architecture may not scale effectively beyond 50,000 DAU, requiring significant architectural changes.

**Impact Assessment:** Medium
- Performance degradation as traffic grows
- Potential need for expensive architecture changes
- User experience impact

**Likelihood:** Medium
- Current architecture designed for 10,000 DAU
- Growth projections indicate potential scalability challenges

**Mitigation Strategies:**
1. **Scalability Planning:**
   - Regular capacity planning reviews
   - Growth projections and scaling milestones
   - Architecture evolution roadmap

2. **Proactive Scaling:**
   - Monitor growth trends
   - Scale resources before reaching limits
   - Consider Aurora PostgreSQL for better scalability

3. **Architecture Evolution:**
   - Plan for multi-region deployment
   - Consider microservices architecture if needed
   - Implement caching strategies early

4. **Performance Testing:**
   - Regular load testing to identify bottlenecks
   - Stress testing to find breaking points
   - Capacity planning based on test results

**Contingency Plan:**
- Immediate scale-up of resources
- Enable read replicas for database scaling
- Implement aggressive caching
- Consider architecture migration (Aurora, microservices)

**Risk Level:** Medium (M×M)

---

#### Risk 8: Third-Party Dependency Failures

**Description:**
Failures of third-party services (payment gateway, external APIs, CDN) could impact system functionality.

**Impact Assessment:** Medium
- Payment processing failures
- External API unavailability
- CDN failures affecting frontend delivery

**Likelihood:** Medium
- Third-party services have their own SLAs
- However, outages are unpredictable

**Mitigation Strategies:**
1. **Service Redundancy:**
   - Multiple payment gateway providers (if feasible)
   - Fallback mechanisms for external APIs
   - CDN failover to S3 origin

2. **Error Handling:**
   - Graceful error handling for external API failures
   - Retry logic with exponential backoff
   - Queue failed operations for retry

3. **Monitoring:**
   - Monitor third-party service status pages
   - Track external API response times
   - Alert on external service failures

4. **Contractual Agreements:**
   - SLAs with third-party providers
   - Service level expectations documented
   - Alternative providers identified

**Contingency Plan:**
- Enable fallback payment gateway (if available)
- Queue payments for later processing
- Communicate service limitations to users
- Switch to alternative providers if extended outage

**Risk Level:** Medium (M×M)

---

### 10.3 Risk Summary Table

| Risk | Impact | Likelihood | Risk Level | Mitigation Priority |
|------|--------|------------|------------|-------------------|
| Database Bottleneck | High | Medium | Medium | High |
| Security Misconfigurations | High | Medium | High | Critical |
| Cost Overruns | Medium | Medium | Medium | Medium |
| DDoS Attacks | High | Low | Medium | Medium |
| Data Loss/Corruption | High | Low | Medium | High |
| Service Availability Issues | High | Medium | Medium | High |
| Scalability Limitations | Medium | Medium | Medium | Medium |
| Third-Party Dependency Failures | Medium | Medium | Medium | Medium |

---

## 11. Appendix

### 11.1 Capacity Calculation Details

#### 11.1.1 Request Processing Capacity

**Single Task Capacity:**
- **CPU**: 0.5 vCPU
- **Concurrent Requests**: ~10 requests (assuming 50ms processing time)
- **Throughput**: 10 requests × (1000ms / 50ms) = 200 requests/second per task (theoretical)
- **Practical Throughput**: ~33 RPS per task (accounting for overhead, database queries)

**Total System Capacity:**
- **Baseline (3 tasks)**: 3 × 33 = 99 RPS
- **Peak (10 tasks)**: 10 × 33 = 330 RPS
- **Safety Margin**: 100 RPS target with 330 RPS capacity = 3.3× safety margin

#### 11.1.2 Database Connection Pool Sizing

**Connection Pool Calculation:**
- **ECS Tasks**: 10 tasks (maximum)
- **Connections per Task**: 5 connections
- **Total Connections**: 10 × 5 = 50 connections
- **RDS Max Connections**: db.t3.medium supports ~87 connections (based on memory)
- **Headroom**: 87 - 50 = 37 connections available for admin/backup operations

**Connection Pool Configuration:**
```typescript
const pool = new Pool({
  max: 5, // Maximum connections per task
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

#### 11.1.3 Storage Growth Projections

**Year 1 Storage Growth:**
- **Initial**: 2.5 GB
- **Monthly Growth**: 10% (bookings, logs)
- **Month 12**: 2.5 GB × (1.10)^12 = ~7.8 GB
- **RDS Storage**: 100 GB provides ~13× headroom

**Year 3 Storage Projection:**
- **Year 3**: ~25 GB (with 10% monthly growth)
- **RDS Storage**: 100 GB still sufficient, but consider scaling to 200 GB

### 11.2 Cost Breakdown Tables

#### 11.2.1 Monthly Cost Breakdown (Detailed)

| Service | Component | Quantity | Unit Cost | Monthly Cost |
|---------|-----------|----------|-----------|--------------|
| **ECS Fargate** | vCPU (0.5 per task) | 2.5 avg | $0.04048/vCPU-hr | $73.88 |
| | Memory (1 GB per task) | 5 avg | $0.004445/GB-hr | $16.22 |
| **RDS PostgreSQL** | Instance (Multi-AZ) | 2 | $0.136/hr | $198.56 |
| | Storage (gp3) | 100 GB | $0.115/GB | $11.50 |
| | Backup Storage | 50 GB | $0.095/GB | $4.75 |
| **ElastiCache** | Node (cache.t3.micro) | 1 | $0.017/hr | $12.41 |
| **S3** | Standard Storage | 50 GB | $0.023/GB | $1.15 |
| | PUT Requests | 10,000 | $0.005/1K | $0.05 |
| | GET Requests | 100,000 | $0.0004/1K | $0.04 |
| **CloudFront** | Data Transfer | 500 GB | $0.085/GB | $42.50 |
| | HTTP/HTTPS Requests | 15M | $0.0075/10K | $11.25 |
| **ALB** | Load Balancer | 1 | $0.0225/hr | $16.43 |
| | LCU | 50 | $0.008/LCU-hr | $0.40 |
| **NAT Gateway** | Gateway (3 AZs) | 3 | $0.045/hr | $98.55 |
| | Data Processing | 500 GB | $0.045/GB | $22.50 |
| **VPC Endpoint** | Endpoint | 1 | $0.01/hr | $7.30 |
| **CloudWatch** | Custom Metrics | 20 | $0.30/metric | $6.00 |
| | Log Ingestion | 5 GB | $0.50/GB | $2.50 |
| | Dashboards | 3 | $3.00/dashboard | $9.00 |
| | Alarms | 15 | $0.10/alarm | $1.50 |
| **WAF** | Web ACL | 1 | $5.00/month | $5.00 |
| | Rules | 10 | $1.00/rule | $10.00 |
| | Requests | 10M | $0.60/1M | $6.00 |
| **Secrets Manager** | Secrets | 5 | $0.40/secret | $2.00 |
| **Total** | | | | **~$560** |

#### 11.2.2 Annual Cost Projection

| Year | Monthly Cost | Annual Cost | Growth Factor |
|------|--------------|-------------|---------------|
| Year 1 | $560 | $6,720 | Baseline |
| Year 2 | $650 | $7,800 | +16% (traffic growth) |
| Year 3 | $780 | $9,360 | +20% (traffic growth) |

**Note**: Costs assume traffic growth but no major architecture changes.

### 11.3 Network CIDR Allocations

#### 11.3.1 VPC CIDR Allocation

**VPC CIDR**: 10.0.0.0/16 (65,536 IP addresses)

**Subnet Allocations:**

| Subnet Type | CIDR Block | IP Range | Available IPs | Purpose |
|-------------|------------|---------|---------------|---------|
| Public Subnet 1 (AZ-a) | 10.0.1.0/24 | 10.0.1.0 - 10.0.1.255 | 251 | ALB, NAT Gateway |
| Public Subnet 2 (AZ-b) | 10.0.2.0/24 | 10.0.2.0 - 10.0.2.255 | 251 | ALB, NAT Gateway |
| Public Subnet 3 (AZ-c) | 10.0.3.0/24 | 10.0.3.0 - 10.0.3.255 | 251 | ALB, NAT Gateway |
| Private App Subnet 1 (AZ-a) | 10.0.10.0/24 | 10.0.10.0 - 10.0.10.255 | 251 | ECS Tasks |
| Private App Subnet 2 (AZ-b) | 10.0.11.0/24 | 10.0.11.0 - 10.0.11.255 | 251 | ECS Tasks |
| Private App Subnet 3 (AZ-c) | 10.0.12.0/24 | 10.0.12.0 - 10.0.12.255 | 251 | ECS Tasks |
| Private Data Subnet 1 (AZ-a) | 10.0.20.0/24 | 10.0.20.0 - 10.0.20.255 | 251 | RDS, Redis |
| Private Data Subnet 2 (AZ-b) | 10.0.21.0/24 | 10.0.21.0 - 10.0.21.255 | 251 | RDS, Redis |
| Private Data Subnet 3 (AZ-c) | 10.0.22.0/24 | 10.0.22.0 - 10.0.22.255 | 251 | RDS, Redis |

**Reserved IPs:**
- Network address: 10.0.x.0
- Broadcast address: 10.0.x.255
- AWS reserved: 10.0.x.1, 10.0.x.2, 10.0.x.3
- Available for use: 251 IPs per subnet

### 11.4 References and Citations

1. **AWS Documentation:**
   - Amazon ECS Fargate Pricing: https://aws.amazon.com/fargate/pricing/
   - Amazon RDS Pricing: https://aws.amazon.com/rds/pricing/
   - Amazon ElastiCache Pricing: https://aws.amazon.com/elasticache/pricing/
   - AWS Well-Architected Framework: https://aws.amazon.com/architecture/well-architected/

2. **Next.js Documentation:**
   - Next.js Deployment: https://nextjs.org/docs/deployment
   - Next.js API Routes: https://nextjs.org/docs/api-routes/introduction

3. **Security Standards:**
   - OWASP Top 10: https://owasp.org/www-project-top-ten/
   - AWS Security Best Practices: https://aws.amazon.com/security/security-resources/

4. **Performance Testing:**
   - k6 Documentation: https://k6.io/docs/
   - Load Testing Best Practices: https://k6.io/docs/test-types/load-testing/

5. **Cost Optimization:**
   - AWS Cost Optimization Pillar: https://aws.amazon.com/architecture/well-architected/
   - AWS Pricing Calculator: https://calculator.aws/

### 11.5 Team Member Contributions

**Team Contribution Mapping:**

| Team Member | Primary Contributions | Secondary Contributions |
|-------------|----------------------|------------------------|
| [Team Member 1 Name - Reg No] | Architecture Design, Network Topology | Security Design, Cost Analysis |
| [Team Member 2 Name - Reg No] | Reliability Analysis, SLOs Definition | Testing Strategy, Risk Management |
| [Team Member 3 Name - Reg No] | Scalability Planning, Performance Analysis | Operations Plan, Monitoring Design |
| [Team Member 4 Name - Reg No] | Security Design, IAM Strategy | Cost Optimization, Documentation |
| [Team Member 5 Name - Reg No] | Testing Strategy, Load Testing | Risk Register, Appendix Compilation |

**Individual Reflection:**

Each team member should provide a 1-page reflection on:
- Their specific contributions to the project
- Challenges faced and how they were overcome
- Key learnings from the CEA exercise
- How the experience contributed to achieving CLO1, CLO2, and CLO4

---

**Document End**


