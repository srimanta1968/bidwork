@feature_id:781e1be1-e9b4-41b9-8adb-fdfeb3f61dba
@epic_id:cae507d5-ecfe-488e-a94a-f6a55f5932cc
Feature: Scheduled Status, Contractor Visit Confirmation & No-Show Escalation
  After both parties approve the schedule and the homeowner pays the deposit, the bid moves to a Scheduled status. On or after the agreed start_date, the homeowner is asked to confirm whether the contractor has visited and discussed the work. If No, the homeowner is offered a one-click option to send a reminder email and is asked again after a configurable wait. If still No after the second check, the homeowner can mark the workorder as Abandoned-by-Contractor; this triggers FT-855 credit transfer to the next-ranked shortlisted bidder, increments the contractor abandonment_flag_count, and records a no-show audit row.

  @scenario_id:4af2090b-bfab-46ee-9b63-e344b3000398
  @scenario_type:API
  @api_test
  Scenario: API Tests: Scheduled Status, Contractor Visit Confirmation & No-Show Escalation (GET/POST/POST)
    # Scenario ID: 4af2090b-bfab-46ee-9b63-e344b3000398
    # Feature ID: 781e1be1-e9b4-41b9-8adb-fdfeb3f61dba
    # Scenario Type: API
    # Description: Auto-generated API test scenario for 4 endpoint(s): GET /api/bids/:id/visit-status, POST /api/bids/:id/visit-confirmation, POST /api/bids/:id/visit-reminder, POST /api/bids/:id/abandon-no-show
    # Priority: medium
    # Status: draft
    # Test Runner Info: feature_id=781e1be1-e9b4-41b9-8adb-fdfeb3f61dba, scenario_id=4af2090b-bfab-46ee-9b63-e344b3000398, type=API
