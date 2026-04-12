@feature_id:c51fc5fa-1534-4937-a0b5-1a0460195593
@epic_id:65d365d6-c552-46ca-80f4-ca311941fb1b
Feature: Create User Login Endpoint
  Develop an API endpoint for user login.

  @scenario_id:8bb46a61-c705-4bac-9088-e4f28cd237de
  @scenario_type:API
  @api_test
  Scenario: API endpoint returns 200 status on successful login
    # Scenario ID: 8bb46a61-c705-4bac-9088-e4f28cd237de
    # Feature ID: c51fc5fa-1534-4937-a0b5-1a0460195593
    # Scenario Type: API
    # Description: API endpoint returns 200 status on successful login
    Given the user has valid login credentials
    When the user sends a login request to the API endpoint
    Then the API responds with a 200 status code
    # Priority: medium
    # Status: draft
    # Test Runner Info: feature_id=c51fc5fa-1534-4937-a0b5-1a0460195593, scenario_id=8bb46a61-c705-4bac-9088-e4f28cd237de, type=API

  @scenario_id:c4ed4b38-6472-4bc8-9818-d32ca4164645
  @scenario_type:API
  @api_test
  Scenario: API responds with a JWT token on successful login
    # Scenario ID: c4ed4b38-6472-4bc8-9818-d32ca4164645
    # Feature ID: c51fc5fa-1534-4937-a0b5-1a0460195593
    # Scenario Type: API
    # Description: API responds with a JWT token on successful login
    Given the user has valid login credentials
    When the user sends a login request to the API endpoint
    Then the API responds with a JWT token
    # Priority: medium
    # Status: draft
    # Test Runner Info: feature_id=c51fc5fa-1534-4937-a0b5-1a0460195593, scenario_id=c4ed4b38-6472-4bc8-9818-d32ca4164645, type=API
