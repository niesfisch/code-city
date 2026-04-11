package de.marcelsauer.codecity.api;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.nio.file.Path;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.is;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class AnalysisControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void shouldAnalyzeProjectThroughRestApi() throws Exception {
        String projectPath = Path.of("..", "samples", "demo-project").toAbsolutePath().normalize().toString();

        mockMvc.perform(post("/api/analyze")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "path": "%s",
                                  "includePattern": "com.example.demo.*"
                                }
                                """.formatted(projectPath.replace("\\", "\\\\"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.metrics.totalPackages", is(2)))
                .andExpect(jsonPath("$.buildings.length()", is(6)))
                .andExpect(jsonPath("$.buildings[0].sourceFileName").isNotEmpty());
    }

    @Test
    void shouldRejectMissingPath() throws Exception {
        mockMvc.perform(post("/api/analyze")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", containsString("Project path is required")));
    }

    @Test
    void shouldRejectNonExistingPath() throws Exception {
        mockMvc.perform(post("/api/analyze")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "path": "/definitely/not/here"
                                }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", containsString("does not exist")));
    }

    @Test
    void shouldReturnSourceFileFromSrcMainJava() throws Exception {
        String projectPath = Path.of("..", "samples", "demo-project").toAbsolutePath().normalize().toString();

        mockMvc.perform(get("/api/analyze/source")
                        .param("projectPath", projectPath)
                        .param("sourceFileName", "GreetingService.java")
                        .param("fullName", "com.example.demo.service.GreetingService")
                        .param("packageName", "com.example.demo.service")
                        .param("name", "GreetingService"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.sourceFileName", is("GreetingService.java")))
                .andExpect(jsonPath("$.language", is("java")))
                .andExpect(jsonPath("$.content", containsString("class GreetingService")));
    }

    @Test
    void shouldRejectPathTraversalInSourceRequest() throws Exception {
        String projectPath = Path.of("..", "samples", "demo-project").toAbsolutePath().normalize().toString();

        mockMvc.perform(get("/api/analyze/source")
                        .param("projectPath", projectPath)
                        .param("sourceFileName", "../../etc/passwd")
                        .param("fullName", "x")
                        .param("packageName", "")
                        .param("name", "x"))
                .andExpect(status().isBadRequest());
    }
}
