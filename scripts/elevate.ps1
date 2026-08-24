param(
  [Parameter(Mandatory = $true)]
  [string]$ExePath,

  [Parameter(Mandatory = $false)]
  [string[]]$AppArgs = @()
)

if ($AppArgs.Count -gt 0) {
  Start-Process -FilePath $ExePath -ArgumentList $AppArgs -Verb RunAs
}
else {
  Start-Process -FilePath $ExePath -Verb RunAs
}
