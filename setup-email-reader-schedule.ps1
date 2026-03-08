# ═══════════════════════════════════════════════════════════════════════════════
# BANF Email Reader - Windows Task Scheduler Setup
# 
# This script creates a Windows scheduled task to run the email reader every 5 min.
# Run this script once with Administrator privileges to set up the schedule.
#
# Usage (Run as Administrator):
#   powershell -ExecutionPolicy Bypass -File .\setup-email-reader-schedule.ps1
#
# ═══════════════════════════════════════════════════════════════════════════════

$TaskName = "BANF_Email_Reader_5Min"
$TaskPath = "C:\projects\banf\bosonto-reader-scheduler.bat"
$WorkingDir = "C:\projects\banf"
$Description = "BANF Bosonto Utsob 2026 - Email Reader Agent (every 5 minutes)"

# Check if running as admin
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "⚠️  This script requires Administrator privileges to create scheduled tasks." -ForegroundColor Yellow
    Write-Host "    Please run PowerShell as Administrator and try again." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "    Or manually create the task using Task Scheduler (taskschd.msc):" -ForegroundColor Cyan
    Write-Host "    1. Create Basic Task → Name: 'BANF Email Reader'" -ForegroundColor Gray
    Write-Host "    2. Trigger: Daily, repeat every 5 minutes for indefinitely" -ForegroundColor Gray
    Write-Host "    3. Action: Start a program → $TaskPath" -ForegroundColor Gray
    Write-Host ""
    exit 1
}

# Remove existing task if present (both old hourly and new 5min)
foreach ($oldTask in @("BANF_Email_Reader_Hourly", "BANF_Email_Reader_5Min")) {
    $existingTask = Get-ScheduledTask -TaskName $oldTask -ErrorAction SilentlyContinue
    if ($existingTask) {
        Write-Host "Removing existing task '$oldTask'..." -ForegroundColor Yellow
        Unregister-ScheduledTask -TaskName $oldTask -Confirm:$false
    }
}

# Create the task action
$Action = New-ScheduledTaskAction -Execute $TaskPath -WorkingDirectory $WorkingDir

# Create trigger: Every 5 minutes, starting now
$Now = Get-Date
$StartTime = $Now.AddMinutes(1)  # Start in 1 minute
$Trigger = New-ScheduledTaskTrigger -Once -At $StartTime -RepetitionInterval (New-TimeSpan -Minutes 5) -RepetitionDuration (New-TimeSpan -Days 365)

# Task settings
$Settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -ExecutionTimeLimit (New-TimeSpan -Minutes 10)

# Create the task
$Principal = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" -LogonType Interactive -RunLevel Limited

Register-ScheduledTask -TaskName $TaskName -Action $Action -Trigger $Trigger -Settings $Settings -Principal $Principal -Description $Description

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host "  ✅ Scheduled Task Created Successfully!" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host ""
Write-Host "  Task Name: $TaskName" -ForegroundColor Cyan
Write-Host "  Interval:  Every 5 minutes" -ForegroundColor Cyan
Write-Host "  Script:    $TaskPath" -ForegroundColor Cyan
Write-Host ""
Write-Host "  To view/manage the task:" -ForegroundColor Gray
Write-Host "    taskschd.msc → Task Scheduler Library → $TaskName" -ForegroundColor Gray
Write-Host ""
Write-Host "  To run the task manually:" -ForegroundColor Gray
Write-Host "    schtasks /run /tn '$TaskName'" -ForegroundColor Gray
Write-Host ""
Write-Host "  To disable/remove:" -ForegroundColor Gray
Write-Host "    schtasks /delete /tn '$TaskName' /f" -ForegroundColor Gray
Write-Host ""

# Also run immediately
Write-Host "Running task now for immediate execution..." -ForegroundColor Yellow
Start-ScheduledTask -TaskName $TaskName

Write-Host "✅ Task triggered. Check bosonto-reader-agent.log for output." -ForegroundColor Green
