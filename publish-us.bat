call yarn run builddev
del dist.tgz
tar czf dist.tgz dist
scp dist.tgz mvv@phub-us:temp
ssh mvv@phub-us "cd temp; ls -l; ./cpvite.sh"
