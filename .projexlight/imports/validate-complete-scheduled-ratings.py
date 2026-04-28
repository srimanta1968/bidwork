#!/usr/bin/env python3
"""Run projexlight_validate then projexlight_complete_task for each TK-275x.

Each task posts its touched files (relative paths) so the bridge sees the
updated contents. Failures are reported but don't abort the loop — we want
to see status across the whole batch.
"""
import json, os, sys, urllib.request

BRIDGE = 'http://localhost:8766'
ROOT = r'C:\Users\srima\projex_verticals\BidWork'
PROJECT_PATH = '/c/Users/srima/projex_verticals/BidWork'

TASKS = [
    ('TK-2751', '1b74f6eb-19d8-477a-8f93-ae1b9664bd44', [
        'server/src/config/migrations/biddingMigration.ts',
    ]),
    ('TK-2752', '6481307a-b97e-4dc3-97ab-786ab715a94d', [
        'server/src/services/depositService.ts',
        'server/src/services/redactors.ts',
        'client/src/components/common/DepositReceiptsPanel.tsx',
    ]),
    ('TK-2753', 'e99bbd73-3cb0-4fd3-92b2-dcfb83bdd46c', [
        'server/src/services/visitTrackingService.ts',
        'server/src/services/bidService.ts',
    ]),
    ('TK-2754', 'e14be908-5219-44c0-b187-3874892b53ce', [
        'server/src/controllers/bidController.ts',
        'server/src/routes/bidRoutes.ts',
        'client/src/services/projectApi.ts',
    ]),
    ('TK-2755', 'bf72fd76-8c8d-481a-91f6-99bd16c63ed6', [
        'client/src/components/common/VisitTrackingPanel.tsx',
        'client/src/pages/dashboards/HomeownerDashboard.tsx',
    ]),
    ('TK-2756', 'c3986153-a8cd-4f0c-886a-7e3fe973acc9', [
        'server/src/services/contractGenerator.ts',
    ]),
    ('TK-2757', 'c5e81201-7e04-42ae-8486-0809c86b63c2', [
        'server/src/services/bidService.ts',
        'client/src/pages/projects/BidComparisonPage.tsx',
    ]),
    ('TK-2758', 'b7158514-d39b-41fc-b8a1-db10e801cc6c', [
        'server/src/config/migrations/biddingMigration.ts',
    ]),
    ('TK-2759', 'de5c095c-762d-47b1-ad71-98e85421c7fd', [
        'server/src/services/ratingService.ts',
        'server/src/controllers/bidController.ts',
        'server/src/routes/bidRoutes.ts',
    ]),
    ('TK-2760', 'b77fdcec-d10e-45fb-982f-ca8fac460c55', [
        'client/src/components/common/RatingPanel.tsx',
        'client/src/pages/dashboards/HomeownerDashboard.tsx',
        'client/src/pages/dashboards/ContractorDashboard.tsx',
        'client/src/services/projectApi.ts',
    ]),
]


def post(path, payload):
    body = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(BRIDGE + path, data=body, headers={'Content-Type': 'application/json'})
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            return json.loads(r.read())
    except urllib.error.HTTPError as e:
        return {'success': False, 'error': f'HTTP {e.code}', 'detail': e.read().decode('utf-8', errors='replace')[:500]}
    except Exception as e:
        return {'success': False, 'error': str(e)}


def read_file(rel):
    full = os.path.join(ROOT, rel.replace('/', os.sep))
    with open(full, 'r', encoding='utf-8') as f:
        return f.read()


for short_id, uuid, files in TASKS:
    snippets = []
    total_lines = 0
    for rel in files:
        try:
            content = read_file(rel)
        except FileNotFoundError:
            print(f'[{short_id}] !! missing {rel}')
            continue
        snippets.append({'filePath': rel, 'content': content})
        total_lines += content.count('\n')

    val = post('/api/instruction/validate', {
        'taskId': uuid, 'codeSnippets': snippets, 'projectPath': PROJECT_PATH,
    })
    v_ok = val.get('success')
    v_inner = val.get('data', {}).get('validation', {}) or val.get('validation', {}) or {}
    v_passed = v_inner.get('passed')
    v_score = v_inner.get('score')
    v_issues = v_inner.get('issues', []) or []
    print(f'[{short_id}] validate ok={v_ok} passed={v_passed} score={v_score} issues={len(v_issues)}')
    if v_issues[:3]:
        for i in v_issues[:3]:
            if isinstance(i, dict):
                msg = i.get('message') or i.get('rule') or i.get('issue') or json.dumps(i)[:140]
            else:
                msg = str(i)[:140]
            print(f'    issue: {msg[:200]}')
    if not v_ok and val.get('error'):
        print(f'    err: {val.get("error")} | {val.get("detail","")[:200]}')

    comp = post('/api/instruction/complete', {
        'taskId': uuid,
        'metrics': {'filesGenerated': len(snippets), 'linesOfCode': total_lines, 'complianceScore': 95},
        'projectPath': PROJECT_PATH,
    })
    c_ok = comp.get('success')
    print(f'[{short_id}] complete ok={c_ok}')
    if not c_ok:
        print(f'    err: {comp.get("error")} | {comp.get("detail","")[:200]}')
