# AGENTS Policy

## Model Selection Policy

Before starting any task, classify the work.

### Use GPT-5.3-Codex-Spark when

- UI changes
- CSS
- Small feature additions
- Small bug fixes
- Test creation
- Documentation edits
- Refactoring within a single file
- Fast iterative development

### Use GPT-5.5 when

- Architecture design
- Complex debugging
- Performance optimization
- Multi-file refactoring
- Kubernetes
- Helm
- ArgoCD
- MCP
- Backend infrastructure
- Security review
- Database schema design

If the current model is not appropriate,
STOP and inform the user which model would be better before proceeding.
