import fs from 'fs';
import path from 'path';
import { toggleMod } from '../../main/mod-manager';

jest.mock('fs');
const mockFs = jest.mocked(fs);

const sep = path.sep;

describe('toggleMod', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('should move mod from mods/ to disabled-mods/ when disabling', () => {
    mockFs.existsSync
      .mockReturnValueOnce(true) // disabledModsDir exists
      .mockReturnValueOnce(true) // src (enabledPath) exists
      .mockReturnValueOnce(false); // dst (disabledPath) does not exist
    mockFs.renameSync.mockReturnValue(undefined);

    toggleMod('/server', '/disabled-mods', 'MyMod', false);

    expect(mockFs.renameSync).toHaveBeenCalledWith(
      expect.stringContaining(`mods${sep}MyMod`), // src = enabled path
      expect.stringContaining('disabled-mods') // dst
    );
  });

  it('should move mod from disabled-mods/ to mods/ when enabling', () => {
    mockFs.existsSync
      .mockReturnValueOnce(true) // disabledModsDir exists
      .mockReturnValueOnce(true) // src (disabledPath) exists
      .mockReturnValueOnce(false); // dst (enabledPath) does not exist
    mockFs.renameSync.mockReturnValue(undefined);

    toggleMod('/server', '/disabled-mods', 'MyMod', true);

    expect(mockFs.renameSync).toHaveBeenCalledWith(
      expect.stringContaining('disabled-mods'), // src = disabled path
      expect.stringContaining(`mods${sep}MyMod`) // dst = enabled path
    );
  });

  it('should create disabled-mods directory if it does not exist', () => {
    mockFs.existsSync
      .mockReturnValueOnce(false) // disabledModsDir does NOT exist
      .mockReturnValueOnce(true) // src exists
      .mockReturnValueOnce(false); // dst does not exist
    mockFs.mkdirSync.mockReturnValue(undefined as any);
    mockFs.renameSync.mockReturnValue(undefined);

    toggleMod('/server', '/disabled-mods', 'MyMod', false);

    expect(mockFs.mkdirSync).toHaveBeenCalledWith('/disabled-mods', { recursive: true });
  });

  it('should throw when source directory does not exist', () => {
    mockFs.existsSync
      .mockReturnValueOnce(true) // disabledModsDir exists
      .mockReturnValueOnce(false); // src does NOT exist

    expect(() => toggleMod('/server', '/disabled-mods', 'MyMod', false)).toThrow(
      'mod directory not found'
    );
  });

  it('should throw when destination directory already exists', () => {
    mockFs.existsSync
      .mockReturnValueOnce(true) // disabledModsDir exists
      .mockReturnValueOnce(true) // src exists
      .mockReturnValueOnce(true); // dst ALREADY exists

    expect(() => toggleMod('/server', '/disabled-mods', 'MyMod', false)).toThrow(
      'directory already exists at destination'
    );
  });

  it('should throw descriptive error on EACCES', () => {
    mockFs.existsSync
      .mockReturnValueOnce(true)
      .mockReturnValueOnce(true)
      .mockReturnValueOnce(false);

    const err = new Error('EACCES') as NodeJS.ErrnoException;
    err.code = 'EACCES';
    mockFs.renameSync.mockImplementation(() => {
      throw err;
    });

    expect(() => toggleMod('/server', '/disabled-mods', 'MyMod', false)).toThrow(
      /Permission denied/
    );
  });

  it('should throw descriptive error on EPERM', () => {
    mockFs.existsSync
      .mockReturnValueOnce(true)
      .mockReturnValueOnce(true)
      .mockReturnValueOnce(false);

    const err = new Error('EPERM') as NodeJS.ErrnoException;
    err.code = 'EPERM';
    mockFs.renameSync.mockImplementation(() => {
      throw err;
    });

    expect(() => toggleMod('/server', '/disabled-mods', 'MyMod', false)).toThrow(
      /Permission denied/
    );
  });

  it('should throw descriptive error on EBUSY', () => {
    mockFs.existsSync
      .mockReturnValueOnce(true)
      .mockReturnValueOnce(true)
      .mockReturnValueOnce(false);

    const err = new Error('EBUSY') as NodeJS.ErrnoException;
    err.code = 'EBUSY';
    mockFs.renameSync.mockImplementation(() => {
      throw err;
    });

    expect(() => toggleMod('/server', '/disabled-mods', 'MyMod', false)).toThrow(
      /Directory is locked/
    );
  });

  it('should include mod name in error messages', () => {
    mockFs.existsSync
      .mockReturnValueOnce(true)
      .mockReturnValueOnce(true)
      .mockReturnValueOnce(false);

    const err = new Error('generic') as NodeJS.ErrnoException;
    mockFs.renameSync.mockImplementation(() => {
      throw err;
    });

    expect(() => toggleMod('/server', '/disabled-mods', 'TestMod', false)).toThrow(/TestMod/);
  });

  it('should use correct action word (enable vs disable) in errors', () => {
    // Test disable action
    mockFs.existsSync.mockReturnValueOnce(true).mockReturnValueOnce(false);

    expect(() => toggleMod('/server', '/disabled-mods', 'Mod', false)).toThrow(/disable/);

    // Test enable action
    jest.resetAllMocks();
    mockFs.existsSync.mockReturnValueOnce(true).mockReturnValueOnce(false);

    expect(() => toggleMod('/server', '/disabled-mods', 'Mod', true)).toThrow(/enable/);
  });

  it('should not modify file contents (only rename)', () => {
    mockFs.existsSync
      .mockReturnValueOnce(true)
      .mockReturnValueOnce(true)
      .mockReturnValueOnce(false);
    mockFs.renameSync.mockReturnValue(undefined);

    toggleMod('/server', '/disabled-mods', 'MyMod', false);

    // Only renameSync should be called for file operations (besides exists/mkdir)
    expect(mockFs.writeFileSync).not.toHaveBeenCalled();
    expect(mockFs.readFileSync).not.toHaveBeenCalled();
    expect(mockFs.renameSync).toHaveBeenCalledTimes(1);
  });

  describe('input validation (path traversal prevention)', () => {
    it('should throw for mod name containing forward slash', () => {
      expect(() => toggleMod('/server', '/disabled-mods', 'bad/mod', false)).toThrow(
        'Invalid mod name "bad/mod": must not contain path separators or ".."'
      );
      expect(mockFs.existsSync).not.toHaveBeenCalled();
      expect(mockFs.renameSync).not.toHaveBeenCalled();
    });

    it('should throw for mod name containing backslash', () => {
      expect(() => toggleMod('/server', '/disabled-mods', 'bad\\mod', false)).toThrow(
        'Invalid mod name "bad\\mod": must not contain path separators or ".."'
      );
      expect(mockFs.existsSync).not.toHaveBeenCalled();
      expect(mockFs.renameSync).not.toHaveBeenCalled();
    });

    it('should throw for mod name containing ".."', () => {
      expect(() => toggleMod('/server', '/disabled-mods', '..', false)).toThrow(
        'Invalid mod name "..": must not contain path separators or ".."'
      );
      expect(mockFs.existsSync).not.toHaveBeenCalled();
      expect(mockFs.renameSync).not.toHaveBeenCalled();
    });

    it('should throw for path traversal attempt like "../../etc"', () => {
      expect(() => toggleMod('/server', '/disabled-mods', '../../etc', false)).toThrow(
        'Invalid mod name "../../etc": must not contain path separators or ".."'
      );
      expect(mockFs.existsSync).not.toHaveBeenCalled();
      expect(mockFs.renameSync).not.toHaveBeenCalled();
    });

    it('should throw for mod name with embedded ".." like "foo..bar"', () => {
      expect(() => toggleMod('/server', '/disabled-mods', 'foo..bar', false)).toThrow(
        'Invalid mod name "foo..bar": must not contain path separators or ".."'
      );
      expect(mockFs.existsSync).not.toHaveBeenCalled();
    });

    it('should allow valid mod names with spaces, hyphens, and underscores', () => {
      mockFs.existsSync
        .mockReturnValueOnce(true) // disabledModsDir exists
        .mockReturnValueOnce(true) // src exists
        .mockReturnValueOnce(false); // dst does not exist
      mockFs.renameSync.mockReturnValue(undefined);

      // Should not throw
      expect(() => toggleMod('/server', '/disabled-mods', 'My Cool-Mod_v2', false)).not.toThrow();
      expect(mockFs.renameSync).toHaveBeenCalled();
    });

    it('should validate mod name before any filesystem operations', () => {
      // The validation should throw BEFORE existsSync is called
      expect(() => toggleMod('/server', '/disabled-mods', '../escape', false)).toThrow(
        /Invalid mod name/
      );

      // No filesystem calls should have been made
      expect(mockFs.existsSync).not.toHaveBeenCalled();
      expect(mockFs.mkdirSync).not.toHaveBeenCalled();
      expect(mockFs.renameSync).not.toHaveBeenCalled();
    });
  });
});
