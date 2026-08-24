# yarn run builddev

rm dist/assets/*.map

for f in dist/assets/*.js; do
    sed -i /sourceMappingURL=index/d $f
done

rm dist.tgz
tar czf dist.tgz dist
scp dist.tgz mvv@trial:temp
ssh mvv@trial "cd temp; ls -l; ./cp-frontend.sh"

# rem ssh mvv@trial "cd temp; ls -l; ./cpvite1.sh"
