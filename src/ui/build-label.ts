export interface BuildInfo {
  version: string;
  commit: string;
}

export function showBuildLabel(parent: HTMLElement, build: BuildInfo): void {
  const label = document.createElement('div');
  label.className = 'build-label';
  label.textContent = `v${build.version} · ${build.commit}`;
  parent.append(label);
}
