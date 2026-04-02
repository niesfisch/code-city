package de.marcelsauer.codecity.parser;

import de.marcelsauer.codecity.model.Building;
import de.marcelsauer.codecity.model.BuildingType;
import de.marcelsauer.codecity.model.Cityscape;
import org.junit.jupiter.api.Test;

import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThat;

class JavaAnalysisServiceTest {

    private final JavaAnalysisService analysisService = new JavaAnalysisService();

    @Test
    void shouldAnalyzeSampleProjectIntoCityscape() throws Exception {
        Path sampleProject = Path.of("..", "samples", "demo-project").toAbsolutePath().normalize();

        Cityscape cityscape = analysisService.analyzePath(sampleProject.toString(), "com.example.demo.*", null, true);

        // Hierarchical layout: 2 leaf plateaus (api, service) + 1 shared parent (com.example.demo)
        assertThat(cityscape.getPlateaus()).hasSize(3);
        assertThat(cityscape.getBuildings()).hasSize(6);
        assertThat(cityscape.getMetrics().getTotalPackages()).isEqualTo(2);
        assertThat(cityscape.getMetrics().getTotalInterfaces()).isEqualTo(1);
        assertThat(cityscape.getMetrics().getTotalMethods()).isGreaterThanOrEqualTo(4);
        assertThat(cityscape.getBuildings())
                .extracting(Building::getPosition)
                .doesNotContainNull();
        assertThat(cityscape.getBuildings())
                .extracting(Building::getType)
                .contains(BuildingType.CLASS, BuildingType.INTERFACE, BuildingType.ENUM, BuildingType.RECORD, BuildingType.ABSTRACT);
        assertThat(cityscape.getBuildings())
                .extracting(Building::getSourceFileName)
                .allSatisfy(file -> assertThat(file).isNotBlank())
                .anySatisfy(file -> assertThat(file).endsWith(".java"));
    }

    @Test
    void shouldApplyExcludePattern() throws Exception {
        Path sampleProject = Path.of("..", "samples", "demo-project").toAbsolutePath().normalize();

        Cityscape cityscape = analysisService.analyzePath(sampleProject.toString(), "com.example.demo.*", "*.api.*", true);

        assertThat(cityscape.getPlateaus()).hasSize(1);
        assertThat(cityscape.getBuildings())
                .extracting(Building::getPackageName)
                .containsOnly("com.example.demo.service");
    }

    @Test
    void isTestFile_detectsTestSourceDir() {
        Path base = Path.of("/project");
        assertThat(JavaAnalysisService.isTestFile(base, base.resolve("src/test/java/com/example/FooTest.java"))).isTrue();
        assertThat(JavaAnalysisService.isTestFile(base, base.resolve("src/main/java/com/example/Foo.java"))).isFalse();
    }

    @Test
    void isTestFile_detectsTestNamingConventions() {
        Path base = Path.of("/project/src/main/java");
        assertThat(JavaAnalysisService.isTestFile(base, base.resolve("FooTest.java"))).isTrue();
        assertThat(JavaAnalysisService.isTestFile(base, base.resolve("FooTests.java"))).isTrue();
        assertThat(JavaAnalysisService.isTestFile(base, base.resolve("FooIT.java"))).isTrue();
        assertThat(JavaAnalysisService.isTestFile(base, base.resolve("FooITCase.java"))).isTrue();
        assertThat(JavaAnalysisService.isTestFile(base, base.resolve("FooTestCase.java"))).isTrue();
        assertThat(JavaAnalysisService.isTestFile(base, base.resolve("TestFoo.java"))).isTrue();
        assertThat(JavaAnalysisService.isTestFile(base, base.resolve("FooService.java"))).isFalse();
        assertThat(JavaAnalysisService.isTestFile(base, base.resolve("FooRepository.java"))).isFalse();
    }
}
