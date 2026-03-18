// Auto-publish script for Wix CLI  
// Spawns wix publish and pipes Enter + Y to auto-confirm prompts
const { spawn } = require('child_process');
const path = require('path');

const cwd = path.resolve(__dirname, 'banf-wix-linked');
const wixBin = path.join(cwd, 'node_modules', '.bin', 'wix.cmd');

console.log('Starting wix publish from:', cwd);
console.log('Wix CLI:', wixBin);

const proc = spawn(wixBin, ['publish'], {
    cwd,
    stdio: ['pipe', 'pipe', 'pipe'],
    shell: true
});

let output = '';
let responded1 = false;
let responded2 = false;

proc.stdout.on('data', (data) => {
    const text = data.toString();
    output += text;
    const clean = text.replace(/[\x1b\x9b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nq-uy=><~]/g, '')
                      .replace(/[^\x20-\x7E\r\n]/g, '')
                      .trim();
    if (clean) console.log('[OUT]', clean.substring(0, 200));
    
    if (!responded1 && output.includes('What would you like to publish')) {
        setTimeout(() => {
            console.log('[AUTO] Pressing Down+Enter to select Local code');
            proc.stdin.write('\x1b[B');
            setTimeout(() => { proc.stdin.write('\n'); }, 500);
            responded1 = true;
        }, 1000);
    }
    
    if (!responded2 && output.includes('Continue with publish')) {
        setTimeout(() => {
            console.log('[AUTO] Sending Y to confirm publish');
            proc.stdin.write('Y\n');
            responded2 = true;
        }, 1000);
    }

    if (responded2 && output.includes('Are you sure you want to continue')) {
        setTimeout(() => {
            console.log('[AUTO] Sending Y to force publish despite build warnings');
            proc.stdin.write('Y\n');
        }, 1000);
    }
});

proc.stderr.on('data', (data) => {
    const text = data.toString().trim();
    if (text && !text.includes('TimeoutNaN')) {
        console.log('[ERR]', text.substring(0, 200));
    }
});

proc.on('close', (code) => {
    console.log('\n[DONE] Exit code:', code);
    if (output.includes('Published successfully') || output.includes('publish complete')) {
        console.log('>>> PUBLISH SUCCEEDED! <<<');
    } else if (output.includes('Preview created successfully')) {
        console.log('>>> Preview was created. Check if publish completed.');
    } else if (output.includes('Failed to deploy')) {
        console.log('>>> PUBLISH FAILED <<<');
    }
});

setTimeout(() => {
    console.log('[TIMEOUT] 5 minutes elapsed, killing process');
    proc.kill();
}, 300000);
