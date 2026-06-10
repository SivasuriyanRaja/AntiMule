import subprocess

def run_cmd(cmd):
    print(f"Running: {cmd}")
    res = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    print("STDOUT:", res.stdout)
    if res.stderr:
        print("STDERR:", res.stderr)
    return res.returncode

# Make sure we don't have uncommitted changes first
run_cmd('git add .')
run_cmd('git commit -m "Auto-commit local changes before merge"')

# Merge favoring our local optimized Vercel files
run_cmd('git fetch origin')
run_cmd('git merge origin/main -X ours -m "Merge remote deployment changes, favoring local optimizations"')

# Push
run_cmd('git push origin main')
