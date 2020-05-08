# 发布npm包

- 确保本地代码已经git commit
- 确保mocha运行通过
- 执行 npm version major | minor | patch 修改版本
- 执行 tsc 编译ts为js
- 执行 npm publish 发布到npm
- 执行 git push 将最新代码推送到远程仓库

>TODO： 抽空弄成Travis CI， 本地只要开发，git commit ，git push，其他动作都让Travis来执行！