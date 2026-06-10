import subprocess

def run_cmd(cmd):
    print(f"Running: {cmd}")
    res = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    print("STDOUT:", res.stdout)
    if res.stderr:
        print("STDERR:", res.stderr)
    return res.returncode

run_cmd('git merge origin/main --allow-unrelated-histories -X ours -m "Merge remote deployment changes, favoring local optimizations"')
run_cmd('git push origin main')
