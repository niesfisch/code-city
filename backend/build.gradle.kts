plugins {
    java
    application
    id("org.springframework.boot") version "3.5.13"
    id("io.spring.dependency-management") version "1.1.7"
    id("org.beryx.runtime") version "2.0.1"
}

application {
    mainClass.set("de.marcelsauer.codecity.CodeCityApplication")
}

dependencies {
    implementation("org.springframework.boot:spring-boot-starter-web")
    implementation("org.springframework.boot:spring-boot-starter-json")
    implementation("org.springframework.boot:spring-boot-starter-validation")
    
    // AST parsing
    implementation("com.github.javaparser:javaparser-core:3.26.1")
    
    // Utilities
    implementation("org.apache.commons:commons-lang3:3.15.0")
    implementation("commons-io:commons-io:2.17.0")
    
    // Lombok for less boilerplate
    compileOnly("org.projectlombok:lombok:1.18.34")
    annotationProcessor("org.projectlombok:lombok:1.18.34")
    
    // Testing
    testImplementation("org.springframework.boot:spring-boot-starter-test")
    testRuntimeOnly("org.junit.platform:junit-platform-launcher")
}

tasks.named<Jar>("jar") {
    enabled = true
}

tasks.named<org.springframework.boot.gradle.tasks.bundling.BootJar>("bootJar") {
    archiveFileName.set("code-city.jar")
}

val frontendBuildDir = project(":frontend").layout.buildDirectory.dir("dist")

tasks.processResources {
    dependsOn(":frontend:buildFrontend")
    from(frontendBuildDir) {
        into("static")
    }
}

runtime {
    options.set(listOf("--strip-debug", "--compress", "2", "--no-header-files", "--no-man-pages"))
    modules.set(listOf("java.base", "java.desktop", "java.instrument", "java.logging", "java.management", "java.naming", "java.net.http", "java.security.jgss", "java.sql", "jdk.unsupported"))
    jpackage {
        imageName = "code-city"
        appVersion = project.version.toString()
        skipInstaller = true
        installerOptions = listOf("--vendor", "Marcel Sauer")
    }
}

