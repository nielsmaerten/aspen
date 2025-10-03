import path from 'node:path';

interface PkgProcess extends NodeJS.Process {
  pkg?: unknown;
}

function isPackaged(processRef: NodeJS.Process): processRef is PkgProcess {
  return typeof (processRef as PkgProcess).pkg !== 'undefined';
}

export function getExecutableDir(): string {
  if (isPackaged(process)) {
    return path.dirname(process.execPath);
  }

  return process.cwd();
}
