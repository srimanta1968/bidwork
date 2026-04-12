@feature_id:27bb0059-309e-421f-8e87-f5ffd88a673c
@epic_id:65d365d6-c552-46ca-80f4-ca311941fb1b
Feature: Create User Registration Endpoint
  Develop an API endpoint for user registration.

  @scenario_id:71ae860f-9ada-469d-a1ea-07f488a45f2f
  @scenario_type:UI
  @ui_test
  Scenario: API endpoint returns 201 status on successful registration
    # Scenario ID: 71ae860f-9ada-469d-a1ea-07f488a45f2f
    # Feature ID: 27bb0059-309e-421f-8e87-f5ffd88a673c
    # Scenario Type: UI
    # Description: API endpoint returns 201 status on successful registration
    Given the user provides valid registration details
    When the user submits the registration form
    Then the API returns a 201 status
    # Priority: medium
    # Status: draft
    # Test Runner Info: feature_id=27bb0059-309e-421f-8e87-f5ffd88a673c, scenario_id=71ae860f-9ada-469d-a1ea-07f488a45f2f, type=UI

  @scenario_id:c45936cc-320c-40d9-8986-a57d8cc220af
  @scenario_type:API
  @api_test
  Scenario: API responds with user data excluding password
    # Scenario ID: c45936cc-320c-40d9-8986-a57d8cc220af
    # Feature ID: 27bb0059-309e-421f-8e87-f5ffd88a673c
    # Scenario Type: API
    # Description: API responds with user data excluding password
    Given the user registers successfully
    When the user requests the registered user data
    Then the API responds with user data excluding the password
    # Priority: medium
    # Status: draft
    # Test Runner Info: feature_id=27bb0059-309e-421f-8e87-f5ffd88a673c, scenario_id=c45936cc-320c-40d9-8986-a57d8cc220af, type=API
