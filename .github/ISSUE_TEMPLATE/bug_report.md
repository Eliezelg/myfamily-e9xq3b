---
name: Bug Report
about: Create a detailed bug report to help us improve MyFamily platform
title: '[BUG] '
labels: ['bug', 'needs-triage']
assignees: ''
projects: ['Bug Tracking Board']
---

## Bug Description
### Summary
<!-- Provide a clear and concise description of the bug -->

### Expected Behavior
<!-- Describe what should happen -->

### Actual Behavior
<!-- Describe what actually happens -->

### Impact Assessment
**Severity Level:** <!-- Choose one -->
- [ ] P0 - Critical (Service outage, data loss)
- [ ] P1 - High (Major functionality broken)
- [ ] P2 - Medium (Feature partially broken)
- [ ] P3 - Low (Minor issues)

**Affected User Group:**
- [ ] Family Members
- [ ] Content Contributors
- [ ] Administrators

**Business Impact:**
<!-- Describe the impact on business operations -->

**Data Privacy Implications:**
<!-- Note any potential data privacy or security concerns -->

## Environment
### Platform Details
- Platform: <!-- Web/Mobile/Both -->
- Browser/Device: <!-- e.g., Chrome 96.0.4664.93, iPhone 13 -->
- Operating System: <!-- e.g., Windows 11, iOS 15.2 -->
- App Version: <!-- e.g., 1.2.3 -->
- User Role: <!-- e.g., Family Admin, Content Contributor -->
- Geographic Location: <!-- e.g., Israel, Europe -->
- Network Conditions: <!-- e.g., Wifi, 4G -->
- Language/Locale: <!-- e.g., en-US, he-IL -->

## Reproduction Steps
### Prerequisites
<!-- List any required preconditions -->

### Steps to Reproduce
1. 
2. 
3. 

### Occurrence Pattern
- Frequency: <!-- e.g., Always, Intermittent -->
- Timeline: <!-- When was it first noticed -->
- Reproducibility: <!-- e.g., 100%, 50% -->

### Affected Features
<!-- List all affected features/functionality -->

## Technical Details
### Component Information
- Affected Components:
  - [ ] Frontend
  - [ ] Backend
  - [ ] Mobile
  - [ ] Infrastructure
  - [ ] Database
  - [ ] API
  - [ ] UI/UX

### Error Information
```
<!-- Insert error messages, stack traces here -->
```

### Metrics
- Memory Usage: <!-- if applicable -->
- Performance Metrics: <!-- if applicable -->
- Service Dependencies Affected: <!-- list affected services -->

### Security Assessment
<!-- Note any security implications -->

## Additional Context
### Visual Evidence
<!-- Attach screenshots or videos if available -->

### Related Information
- Related Issues: <!-- #issue-numbers -->
- Recent Changes: <!-- Any recent deployments or changes -->
- Attempted Workarounds: <!-- List any attempted solutions -->

### Business Context
- Customer Impact: <!-- Describe impact on end users -->
- Business Continuity: <!-- Note any business continuity concerns -->
- Compliance Impact: <!-- Note any regulatory compliance issues -->

### Monitoring Data
<!-- Auto-populated by monitoring systems -->
- Error Tracking ID: <!-- ELK Stack reference -->
- Metrics Dashboard: <!-- Grafana dashboard link -->
- Trace ID: <!-- Jaeger trace ID -->
- Alert References: <!-- Related alert IDs -->

/label ~bug ~needs-triage
/assign @service_owner @technical_lead
/cc @qa_team @security_team @development_team @operations_team