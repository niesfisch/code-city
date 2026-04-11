plugins {
    base
    id("com.github.node-gradle.node") version "7.1.0"
}

node {
    version = "20.19.0"
    npmVersion = "10.8.2"
    download = true
}

tasks.register<com.github.gradle.node.npm.task.NpmTask>("buildFrontend") {
    dependsOn("npmInstall")
    workingDir.set(projectDir)
    args.set(listOf("run", "build"))
}

tasks.named("build") {
    dependsOn("buildFrontend")
}

