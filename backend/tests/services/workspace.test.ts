import fs from 'fs';
import { WorkspaceService } from '../../src/services/workspace.service';

describe('Phase 7: Repository Workspace Abstraction Tests', () => {
  it('should create isolated workspace and clean it up automatically with withWorkspace', async () => {
    let capturedPath = '';
    const result = await WorkspaceService.withWorkspace('test_job_123', async (workspacePath) => {
      capturedPath = workspacePath;
      expect(fs.existsSync(workspacePath)).toBe(true);

      // Write a dummy file in workspace
      fs.writeFileSync(`${workspacePath}/test.txt`, 'sample repository code');
      expect(fs.existsSync(`${workspacePath}/test.txt`)).toBe(true);

      return 'workspace_success';
    });

    expect(result).toBe('workspace_success');
    // Ensure cleanup happened
    expect(fs.existsSync(capturedPath)).toBe(false);
  });

  it('should reject path traversal attempts in job identifier', () => {
    // Sanitizes or protects against directory escaping
    const safePath = WorkspaceService.resolveWorkspacePath('../../etc/passwd');
    expect(safePath).not.toContain('..');
  });
});
