// renderer.js
document.addEventListener('DOMContentLoaded', () => {
  // === Advanced UI wiring (paste the two functions below this comment) ===

  (function initAdvancedUI() {
    const model = document.getElementById('recombModel');
    const mr1 = document.getElementById('mr1Wrap');
    const mr2 = document.getElementById('mr2Wrap');
    const mr4 = document.getElementById('mr4Wrap');
    const mr2Count = document.getElementById('mr2Count');
    const a2 = document.getElementById('mr2_a2');
    const b2 = document.getElementById('mr2_b2');
    const dmodel = document.getElementById('dmodel');
    const deltaWrap = document.getElementById('deltaFileWrap');

    const refresh = () => {
      const val = model?.value;
      if (mr1) mr1.style.display = (val === 'MR1') ? 'block' : 'none';
      if (mr2) mr2.style.display = (val === 'MR2') ? 'block' : 'none';
      if (mr4) mr4.style.display = (val === 'MR4') ? 'block' : 'none';
      if (mr2Count && a2 && b2) {
        const two = mr2Count.value === '2';
        a2.style.display = b2.style.display = two ? 'inline-block' : 'none';
      }
      if (deltaWrap && dmodel) deltaWrap.style.display = (dmodel.value === 'file') ? 'block' : 'none';
    };

    model?.addEventListener('change', refresh);
    mr2Count?.addEventListener('change', refresh);
    dmodel?.addEventListener('change', refresh);
    refresh();
  })();

  window.buildAdvancedPhaseArgs = function buildAdvancedPhaseArgs() {
    const args = [];

    // -MR*
    const model = (document.getElementById('recombModel')?.value) || 'MR0';
    if (model === 'MR0' || model === 'MR3') {
      args.push(`-${model}`);
    } else if (model === 'MR1') {
      args.push('-MR1', '1'); // v2.1: n=1
    } else if (model === 'MR2') {
      const n = document.getElementById('mr2Count')?.value || '1';
      const a1 = +document.getElementById('mr2_a1').value;
      const b1 = +document.getElementById('mr2_b1').value;
      if (!a1 || !b1) throw new Error('Please provide a1 and b1 for -MR2.');
      const ints = [Math.min(a1,b1), Math.max(a1,b1)];
      if (n === '2') {
        const a2 = +document.getElementById('mr2_a2').value;
        const b2 = +document.getElementById('mr2_b2').value;
        if (!a2 || !b2) throw new Error('Please provide a2 and b2 for -MR2 with 2 hotspots.');
        ints.push(Math.min(a2,b2), Math.max(a2,b2));
      }
      args.push('-MR2', n, ...ints.map(String));
    } else if (model === 'MR4') {
      const R = (document.getElementById('Rvalue')?.value || '').trim();
      if (!R) throw new Error('Please provide a -R value for -MR4.');
      args.push('-MR4', '-R', R);
    }

    // -N
    const N = (document.getElementById('Ncap')?.value || '').trim();
    if (N) args.push('-N', N);

    // -d
    const dmodel = document.getElementById('dmodel')?.value || '';
    if (dmodel === '1') {
      args.push('-d1');
    } else if (dmodel === 'file') {
      const dfile = (document.getElementById('deltaFile')?.value || '').trim();
      if (!dfile) throw new Error('Please choose a δ-file for -d<file>.');
      args.push(`-d${dfile}`);
    }

    // -p / -q (only if changed)
    const p = (document.getElementById('pthresh')?.value || '0.9').trim();
    const q = (document.getElementById('qthresh')?.value || '0.9').trim();
    if (p && p !== '0.9') args.push(`-p${p}`);
    if (q && q !== '0.9') args.push(`-q${q}`);

    // extra
    const extra = (document.getElementById('extraFlags')?.value || '').trim();
    if (extra) args.push(...extra.split(/\s+/));

    return args;
  };

  // Example: hook into your Run button
  const runBtn = document.getElementById('runBtn');
  runBtn?.addEventListener('click', async () => {
    try {
      const adv = window.buildAdvancedPhaseArgs();
      // Combine with your existing base args:
      // const base = [inp, out, iters, thin, burnin];
      // const finalArgs = [...adv, ...base];
      // await window.electronAPI.runPhase({ args: finalArgs, ...otherStuff });
      console.log('Advanced args:', adv);
    } catch (e) {
      alert(e.message);
    }
  });
});
