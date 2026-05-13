@feature_id:f9d73d21-c56f-4bc8-9f5e-f206c221e2d7
@epic_id:b4d11c00-d7be-4ef0-95b3-fd0ad8cfeb6a
Feature: Platform Analytics & Reporting (Admin Portal)
  Admin portal analytics dashboard with multiple views: (1) Price Variance - avg user-set price vs actual contract price by category/location/time, (2) Platform Usage - active users, projects created, bids submitted, (3) Contract Allocation - bid-to-contract conversion rates, avg bids per project, (4) Revenue Analytics - tied to subscription data. Charts, filterable date ranges, exportable reports.

  @scenario_id:d87fd2c7-e556-4c5e-a5af-b7badb08ab0e
  @scenario_type:api
  Scenario: Implement platform analytics API endpoints
    # Scenario ID: d87fd2c7-e556-4c5e-a5af-b7badb08ab0e
    # Feature ID: f9d73d21-c56f-4bc8-9f5e-f206c221e2d7
    # Scenario Type: api
    # Description: GET /api/admin/analytics/price-variance - avg price variance by category/location/time. GET /api/admin/analytics/platform-usage - users, projects, bids counts over time. GET /api/admin/analytics/contract-allocation - conversion rates, avg bids/project. GET /api/admin/analytics/revenue - MRR, revenue by plan. All support date range filters.
    # Priority: medium
    # Status: draft
    # Test Runner Info: feature_id=f9d73d21-c56f-4bc8-9f5e-f206c221e2d7, scenario_id=d87fd2c7-e556-4c5e-a5af-b7badb08ab0e, type=api

  @scenario_id:dfe2cbda-6c3e-42b4-8b28-e6d082af4c75
  @scenario_type:api
  Scenario: Build analytics dashboard pages in admin portal
    # Scenario ID: dfe2cbda-6c3e-42b4-8b28-e6d082af4c75
    # Feature ID: f9d73d21-c56f-4bc8-9f5e-f206c221e2d7
    # Scenario Type: api
    # Description: Multi-section analytics page: Price Variance charts (bar + line), Platform Usage metrics (users, projects, bids with trend lines), Contract Allocation (conversion funnel, pie chart), Revenue charts. Global date range filter. Summary metric cards. Export to CSV option.
    # Priority: medium
    # Status: draft
    # Test Runner Info: feature_id=f9d73d21-c56f-4bc8-9f5e-f206c221e2d7, scenario_id=dfe2cbda-6c3e-42b4-8b28-e6d082af4c75, type=api
