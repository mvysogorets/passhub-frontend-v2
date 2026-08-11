set dist=passhub-frontend

rmdir /s /q %dist%
rmdir /s /q frontend


call npm run builddev
rename dist frontend

del %dist%.tgz
tar czf %dist%.tgz frontend

rmdir /s /q frontend

scp %dist%.tgz mvv@trial:temp


ssh mvv@trial "cd temp; ls -l; ./cp-frontend.sh"
rem ssh mvv@trial "cd temp; ls -l; ./cpvite1.sh"
time /T 
