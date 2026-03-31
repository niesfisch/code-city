package de.marcelsauer.codecity.parser;

import com.github.javaparser.ParseProblemException;
import com.github.javaparser.ParseResult;
import com.github.javaparser.ParserConfiguration;
import com.github.javaparser.JavaParser;
import com.github.javaparser.ast.CompilationUnit;
import com.github.javaparser.ast.Node;
import com.github.javaparser.ast.body.ClassOrInterfaceDeclaration;
import com.github.javaparser.ast.body.ConstructorDeclaration;
import com.github.javaparser.ast.body.EnumDeclaration;
import com.github.javaparser.ast.body.MethodDeclaration;
import com.github.javaparser.ast.body.RecordDeclaration;
import com.github.javaparser.ast.stmt.CatchClause;
import com.github.javaparser.ast.stmt.DoStmt;
import com.github.javaparser.ast.stmt.ForEachStmt;
import com.github.javaparser.ast.stmt.ForStmt;
import com.github.javaparser.ast.stmt.IfStmt;
import com.github.javaparser.ast.stmt.SwitchEntry;
import com.github.javaparser.ast.stmt.SwitchStmt;
import com.github.javaparser.ast.stmt.WhileStmt;
import de.marcelsauer.codecity.model.Building;
import de.marcelsauer.codecity.model.BuildingType;
import de.marcelsauer.codecity.model.CityMetrics;
import de.marcelsauer.codecity.model.Cityscape;
import de.marcelsauer.codecity.model.Dimensions;
import de.marcelsauer.codecity.model.Metrics;
import de.marcelsauer.codecity.model.Plateau;
import de.marcelsauer.codecity.model.Position;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.TreeMap;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import java.util.stream.Stream;

/**
 * Parses Java source files and extracts code metrics.
 */
@Slf4j
@Service
public class JavaAnalysisService {

    private final JavaParser javaParser = new JavaParser(
            new ParserConfiguration().setLanguageLevel(ParserConfiguration.LanguageLevel.BLEEDING_EDGE)
    );

    private static final Set<String> DEFAULT_IGNORED_DIRECTORIES = Set.of(
            ".git", ".gradle", ".idea", "build", "dist", "node_modules", "out", "target"
    );
    /** Path segments that identify test source roots. */
    private static final Set<String> TEST_SOURCE_DIRS = Set.of("src/test/java", "src/test/groovy", "src/test/kotlin");
    /** Filename suffixes (without .java) that conventionally denote test classes. */
    private static final List<String> TEST_NAME_SUFFIXES = List.of("Test", "Tests", "IT", "ITCase", "TestCase", "Spec");
    /** Filename prefixes that conventionally denote test classes. */
    private static final List<String> TEST_NAME_PREFIXES = List.of("Test");

    /** Space reserved around children inside each plateau. */
    private static final double INNER_PADDING    = 3.5;
    /** Horizontal gap between sibling child plateaus. */
    private static final double CHILD_GAP        = 4.0;
    /** Grid slot size for buildings within a leaf plateau. */
    private static final double BUILDING_SPACING = 4.0;
    /** Minimum edge length of any plateau. */
    private static final double MIN_PLATEAU_SIZE = 12.0;

    public Cityscape analyzePath(String rootPath, String includePattern, String excludePattern, boolean excludeTests) throws IOException {
        Path basePath = Path.of(rootPath).toAbsolutePath().normalize();
        validateRootPath(basePath);

        List<Path> javaFiles = findJavaFiles(basePath, excludeTests);
        Map<String, List<Building>> buildingsByPackage = new LinkedHashMap<>();

        for (Path javaFile : javaFiles) {
            List<Building> buildings = extractBuildings(basePath, javaFile, includePattern, excludePattern);
            for (Building building : buildings) {
                buildingsByPackage.computeIfAbsent(building.getPackageName(), ignored -> new ArrayList<>()).add(building);
            }
        }

        Map<String, List<Building>> sortedPackages = buildingsByPackage.entrySet().stream()
                .sorted(Map.Entry.comparingByKey())
                .collect(Collectors.toMap(
                        Map.Entry::getKey,
                        Map.Entry::getValue,
                        (left, right) -> left,
                        LinkedHashMap::new
                ));

        List<Plateau> plateaus = new ArrayList<>();
        List<Building> buildings = new ArrayList<>();

        PackageNode tree = buildTree(sortedPackages);
        PackageNode layoutRoot = skipSingleChildChain(tree);
        layoutNode(layoutRoot, 0.0, 0.0, 0.0, 1, plateaus, buildings);

        return Cityscape.builder()
                .plateaus(plateaus)
                .buildings(buildings)
                .metrics(buildCityMetrics(sortedPackages, buildings))
                .build();
    }

    private void validateRootPath(Path basePath) {
        if (!Files.exists(basePath)) {
            throw new IllegalArgumentException("Project path does not exist: " + basePath);
        }
        if (!Files.isDirectory(basePath)) {
            throw new IllegalArgumentException("Project path is not a directory: " + basePath);
        }
    }

    private List<Path> findJavaFiles(Path basePath, boolean excludeTests) throws IOException {
        try (Stream<Path> pathStream = Files.walk(basePath)) {
            return pathStream
                    .filter(Files::isRegularFile)
                    .filter(path -> {
                        String name = path.getFileName().toString();
                        return name.endsWith(".java") || name.endsWith(".kt");
                    })
                    .filter(path -> !containsIgnoredDirectory(path))
                    .filter(path -> !excludeTests || !isTestFile(basePath, path))
                    .sorted()
                    .toList();
        }
    }

    /**
     * Detects test files by path convention (src/test/java) and by common
     * naming patterns such as FooTest.java, FooIT.java, TestFoo.java.
     */
    static boolean isTestFile(Path basePath, Path file) {
        String relative = basePath.relativize(file).toString().replace('\\', '/');

        // Path-based: any well-known test source root
        for (String testDir : TEST_SOURCE_DIRS) {
            if (relative.startsWith(testDir + "/") || relative.contains("/" + testDir + "/")) {
                return true;
            }
        }

        // Name-based: check the bare class name (without .java extension)
        String fileName = file.getFileName().toString();
        String baseName = fileName.endsWith(".java") ? fileName.substring(0, fileName.length() - 5) : fileName;

        for (String suffix : TEST_NAME_SUFFIXES) {
            if (baseName.endsWith(suffix)) {
                return true;
            }
        }
        for (String prefix : TEST_NAME_PREFIXES) {
            if (baseName.startsWith(prefix)) {
                return true;
            }
        }

        return false;
    }

    private boolean containsIgnoredDirectory(Path path) {
        for (Path segment : path) {
            if (DEFAULT_IGNORED_DIRECTORIES.contains(segment.toString())) {
                return true;
            }
        }
        return false;
    }

    private List<Building> extractBuildings(Path basePath, Path javaFile, String includePattern, String excludePattern)
            throws IOException {
        String fileName = javaFile.getFileName().toString();
        if (fileName.endsWith(".kt")) {
            return extractKotlinBuildings(basePath, javaFile, includePattern, excludePattern);
        }
        return extractJavaBuildings(basePath, javaFile, includePattern, excludePattern);
    }

    private List<Building> extractJavaBuildings(Path basePath, Path javaFile, String includePattern, String excludePattern)
            throws IOException {
        CompilationUnit compilationUnit;
        try {
            ParseResult<CompilationUnit> parseResult = javaParser.parse(javaFile);
            if (!parseResult.isSuccessful() || parseResult.getResult().isEmpty()) {
                throw new ParseProblemException(parseResult.getProblems());
            }
            compilationUnit = parseResult.getResult().orElseThrow();
        } catch (ParseProblemException exception) {
            log.warn("Skipping unparsable file {}: {}", javaFile, exception.getMessage());
            return List.of();
        }

        String packageName = compilationUnit.getPackageDeclaration()
                .map(declaration -> declaration.getNameAsString())
                .orElse("(default)");
        String relativePath = basePath.relativize(javaFile).toString().replace('\\', '/');

        if (!matchesPattern(packageName, relativePath, includePattern, excludePattern)) {
            return List.of();
        }

        List<Building> buildings = new ArrayList<>();
        buildings.addAll(compilationUnit.findAll(ClassOrInterfaceDeclaration.class).stream()
                .filter(ClassOrInterfaceDeclaration::isTopLevelType)
                .map(type -> toBuilding(type, packageName, javaFile))
                .flatMap(Optional::stream)
                .toList());
        buildings.addAll(compilationUnit.findAll(EnumDeclaration.class).stream()
                .filter(EnumDeclaration::isTopLevelType)
                .map(type -> toBuilding(type, packageName, javaFile))
                .flatMap(Optional::stream)
                .toList());
        buildings.addAll(compilationUnit.findAll(RecordDeclaration.class).stream()
                .filter(RecordDeclaration::isTopLevelType)
                .map(type -> toBuilding(type, packageName, javaFile))
                .flatMap(Optional::stream)
                .toList());
        return buildings;
    }

    private List<Building> extractKotlinBuildings(Path basePath, Path kotlinFile, String includePattern, String excludePattern)
            throws IOException {
        String content = Files.readString(kotlinFile);
        String packageName = extractKotlinPackage(content);
        String relativePath = basePath.relativize(kotlinFile).toString().replace('\\', '/');

        if (!matchesPattern(packageName, relativePath, includePattern, excludePattern)) {
            return List.of();
        }

        List<Building> buildings = new ArrayList<>();
        buildings.addAll(extractKotlinClasses(content, packageName, kotlinFile));
        buildings.addAll(extractKotlinObjects(content, packageName, kotlinFile));
        buildings.addAll(extractKotlinInterfaces(content, packageName, kotlinFile));
        return buildings;
    }

    private String extractKotlinPackage(String content) {
        for (String line : content.split("\n")) {
            if (line.trim().startsWith("package ")) {
                return line.trim().replaceFirst("package\\s+", "").replaceAll("\\s*//.*", "").trim();
            }
        }
        return "(default)";
    }

    private List<Building> extractKotlinClasses(String content, String packageName, Path file) {
        List<Building> buildings = new ArrayList<>();
        Pattern classPattern = Pattern.compile("^\\s*(data\\s+)?class\\s+([A-Za-z_][A-Za-z0-9_]*)\\s*(?:\\(|:)?");
        for (String line : content.split("\n")) {
            if (line.trim().startsWith("class ") || line.trim().startsWith("data class ")) {
                java.util.regex.Matcher m = classPattern.matcher(line);
                if (m.find()) {
                    String className = m.group(2);
                    boolean isDataClass = line.contains("data class");
                    String name = className;
                    BuildingType type = isDataClass ? BuildingType.KOTLIN_DATA_CLASS : BuildingType.KOTLIN_CLASS;
                    Metrics metrics = extractKotlinMetrics(content, className);
                    Building b = newBuilding(packageName, name, file, type, metrics);
                    buildings.add(b);
                }
            }
        }
        return buildings;
    }

    private List<Building> extractKotlinObjects(String content, String packageName, Path file) {
        List<Building> buildings = new ArrayList<>();
        Pattern objectPattern = Pattern.compile("^\\s*object\\s+([A-Za-z_][A-Za-z0-9_]*)\\s*(?::)?");
        for (String line : content.split("\n")) {
            if (line.trim().startsWith("object ")) {
                java.util.regex.Matcher m = objectPattern.matcher(line);
                if (m.find()) {
                    String objectName = m.group(1);
                    String name = objectName;
                    Metrics metrics = extractKotlinMetrics(content, objectName);
                    Building b = newBuilding(packageName, name, file, BuildingType.KOTLIN_OBJECT, metrics);
                    buildings.add(b);
                }
            }
        }
        return buildings;
    }

    private List<Building> extractKotlinInterfaces(String content, String packageName, Path file) {
        List<Building> buildings = new ArrayList<>();
        Pattern interfacePattern = Pattern.compile("^\\s*interface\\s+([A-Za-z_][A-Za-z0-9_]*)\\s*(?::)?");
        for (String line : content.split("\n")) {
            if (line.trim().startsWith("interface ")) {
                java.util.regex.Matcher m = interfacePattern.matcher(line);
                if (m.find()) {
                    String interfaceName = m.group(1);
                    String name = interfaceName;
                    Metrics metrics = extractKotlinMetrics(content, interfaceName);
                    Building b = newBuilding(packageName, name, file, BuildingType.KOTLIN_INTERFACE, metrics);
                    buildings.add(b);
                }
            }
        }
        return buildings;
    }

    private Metrics extractKotlinMetrics(String content, String typeName) {
        int methodCount = 0;
        int fieldCount = 0;
        int lineCount = content.split("\n").length;

        // Simple heuristic: count "fun " for methods and "val/var " for fields
        Pattern funPattern = Pattern.compile("\\bfun\\s+");
        Pattern valVarPattern = Pattern.compile("\\b(val|var)\\s+");

        for (String line : content.split("\n")) {
            methodCount += funPattern.matcher(line).groupCount();
            fieldCount += valVarPattern.matcher(line).groupCount();
        }

        // Kotlin doesn't use constructors the same way, so we'll count primary/secondary constructors
        int constructorCount = 0;
        if (content.contains("constructor")) {
            constructorCount = (int) content.split("constructor").length - 1;
        }

        double cyclomatic = 1.0 + (double) methodCount * 0.5; // Approximate
        double complexity = normalizeComplexity(methodCount, fieldCount, constructorCount, cyclomatic, lineCount);

        return Metrics.builder()
                .methodCount(methodCount)
                .fieldCount(fieldCount)
                .constructorCount(constructorCount)
                .cyclomatic(cyclomatic)
                .linesOfCode(lineCount)
                .complexity(complexity)
                .build();
    }

    private boolean matchesPattern(String packageName, String relativePath, String includePattern, String excludePattern) {
        Pattern include = toPattern(includePattern);
        Pattern exclude = toPattern(excludePattern);
        String dottedPackage = packageName + ".";

        if (exclude != null && (exclude.matcher(packageName).matches()
                || exclude.matcher(dottedPackage).matches()
                || exclude.matcher(relativePath).matches())) {
            return false;
        }
        if (include == null) {
            return true;
        }
        return include.matcher(packageName).matches()
                || include.matcher(dottedPackage).matches()
                || include.matcher(relativePath).matches();
    }

    private Pattern toPattern(String pattern) {
        if (pattern == null || pattern.isBlank()) {
            return null;
        }
        String regex = Stream.of(pattern.trim().split(","))
                .map(String::trim)
                .filter(value -> !value.isEmpty())
                .map(this::patternToRegex)
                .collect(Collectors.joining("|", "(?:", ")"));
        return Pattern.compile(regex);
    }

    private String patternToRegex(String pattern) {
        if (!pattern.contains("*")) {
            String escaped = Pattern.quote(pattern);
            return "^(?:" + escaped + "(?:$|[./].*))$";
        }
        return globToRegex(pattern);
    }

    private String globToRegex(String pattern) {
        StringBuilder builder = new StringBuilder("^.*");
        for (char current : pattern.toCharArray()) {
            switch (current) {
                case '*' -> builder.append(".*");
                case '.' -> builder.append("\\.");
                case '\\' -> builder.append("\\\\");
                case '/' -> builder.append("/");
                default -> {
                    if ("+()^${}[]?|".indexOf(current) >= 0) {
                        builder.append('\\');
                    }
                    builder.append(current);
                }
            }
        }
        return builder.append(".*$").toString();
    }

    private Optional<Building> toBuilding(ClassOrInterfaceDeclaration declaration, String packageName, Path sourceFile) {
        BuildingType buildingType = declaration.isInterface()
                ? BuildingType.INTERFACE
                : declaration.isAbstract() ? BuildingType.ABSTRACT : BuildingType.CLASS;
        Metrics metrics = metricsFor(
                declaration.getMethods(),
                declaration.getFields().size(),
                declaration.getConstructors(),
                lineCountFor(declaration)
        );
        return Optional.of(newBuilding(packageName, declaration.getNameAsString(), sourceFile, buildingType, metrics));
    }

    private Optional<Building> toBuilding(EnumDeclaration declaration, String packageName, Path sourceFile) {
        Metrics metrics = metricsFor(
                declaration.getMethods(),
                declaration.getFields().size(),
                List.of(),
                lineCountFor(declaration)
        );
        return Optional.of(newBuilding(packageName, declaration.getNameAsString(), sourceFile, BuildingType.ENUM, metrics));
    }

    private Optional<Building> toBuilding(RecordDeclaration declaration, String packageName, Path sourceFile) {
        Metrics metrics = metricsFor(
                declaration.getMethods(),
                declaration.getParameters().size(),
                List.of(),
                lineCountFor(declaration)
        );
        return Optional.of(newBuilding(packageName, declaration.getNameAsString(), sourceFile, BuildingType.RECORD, metrics));
    }

    private Building newBuilding(String packageName, String typeName, Path sourceFile, BuildingType type, Metrics metrics) {
        return Building.builder()
                .name(typeName)
                .fullName("(default)".equals(packageName) ? typeName : packageName + "." + typeName)
                .packageName(packageName)
                .type(type)
                .metrics(metrics)
                .color(type.getDefaultColor())
                .build();
    }

    private Metrics metricsFor(Collection<MethodDeclaration> methods,
                               int fieldCount,
                               Collection<ConstructorDeclaration> constructors,
                               int linesOfCode) {
        int methodCount = methods.size();
        int constructorCount = constructors.size();
        double cyclomatic = methods.stream().mapToDouble(this::cyclomaticComplexity).sum()
                + constructors.stream().mapToDouble(this::cyclomaticComplexity).sum();
        double complexity = normalizeComplexity(methodCount, fieldCount, constructorCount, cyclomatic, linesOfCode);

        return Metrics.builder()
                .methodCount(methodCount)
                .fieldCount(fieldCount)
                .constructorCount(constructorCount)
                .cyclomatic(cyclomatic)
                .linesOfCode(linesOfCode)
                .complexity(complexity)
                .build();
    }

    private double cyclomaticComplexity(Node node) {
        return 1
                + node.findAll(IfStmt.class).size()
                + node.findAll(ForStmt.class).size()
                + node.findAll(ForEachStmt.class).size()
                + node.findAll(WhileStmt.class).size()
                + node.findAll(DoStmt.class).size()
                + node.findAll(CatchClause.class).size()
                + node.findAll(SwitchStmt.class).stream().mapToInt(switchStmt -> Math.max(0, switchStmt.getEntries().size() - 1)).sum()
                + node.findAll(SwitchEntry.class).stream().mapToInt(entry -> entry.getLabels().isEmpty() ? 0 : Math.max(0, entry.getLabels().size() - 1)).sum();
    }

    /**
     * Composite complexity score stored on the {@link Metrics} object and shown
     * in the selection panel.  It is <em>not</em> used to drive building
     * dimensions — those follow the Wettel CodeCity mapping (NOM → height,
     * NOA → width, LOC → depth).
     */
    private double normalizeComplexity(int methodCount, int fieldCount, int constructorCount, double cyclomatic, int linesOfCode) {
        double weightedScore = (methodCount * 1.5)
                + (fieldCount * 0.8)
                + (constructorCount * 1.1)
                + cyclomatic
                + Math.max(1, linesOfCode) / 12.0;
        return Math.round((1.5 + (weightedScore / 6.5)) * 100.0) / 100.0;
    }

    private int lineCountFor(Node node) {
        return node.getRange()
                .map(range -> Math.max(1, range.end.line - range.begin.line + 1))
                .orElse(1);
    }

    // ------------------------------------------------------------------
    // Hierarchical city layout  (package tree → nested plateaus)
    // ------------------------------------------------------------------

    /**
     * Builds a tree of {@link PackageNode}s from the flat package→buildings map.
     * Each dot-separated segment becomes one level in the tree.
     */
    private PackageNode buildTree(Map<String, List<Building>> packageMap) {
        PackageNode root = new PackageNode("", "", 0);
        for (Map.Entry<String, List<Building>> entry : packageMap.entrySet()) {
            String[] segs = entry.getKey().split("\\.");
            PackageNode cur = root;
            for (int i = 0; i < segs.length; i++) {
                String seg = segs[i];
                String parentFull = cur.fullName;
                String childFull = parentFull.isEmpty() ? seg : parentFull + "." + seg;
                int childDepth = i + 1;
                cur = cur.children.computeIfAbsent(seg,
                        k -> new PackageNode(k, childFull, childDepth));
            }
            cur.ownBuildings.addAll(entry.getValue());
        }
        return root;
    }

    /**
     * Skips trivial single-child, no-building chains at the top of the tree so
     * that e.g. {@code de → de.otto → de.otto.shop} (all with only one child)
     * collapses to {@code de.otto.shop} before we start creating plateaus.
     * Stops at the first node that either has own buildings or branches into
     * multiple children.
     */
    private PackageNode skipSingleChildChain(PackageNode node) {
        while (node.ownBuildings.isEmpty() && node.children.size() == 1) {
            node = node.children.values().iterator().next();
        }
        return node;
    }

    /**
     * Returns the children that should be laid out inside {@code node}.
     * If the node has both sub-packages AND its own buildings, a synthetic
     * "(classes)" leaf is prepended so those buildings also get their own
     * mini-plateau instead of floating without a parent.
     */
    private List<PackageNode> computeChildrenList(PackageNode node) {
        List<PackageNode> list = new ArrayList<>(node.children.values());
        if (!node.ownBuildings.isEmpty() && !node.children.isEmpty()) {
            PackageNode leaf = new PackageNode("(classes)", node.fullName, node.depth + 1);
            leaf.ownBuildings.addAll(node.ownBuildings);
            list.add(0, leaf);
        }
        return list;
    }

    /**
     * Pure size estimator — no side effects, no object creation.
     * Returns {@code {totalWidth, totalDepth}} that a plateau for this node
     * would occupy, padding included.
     */
    private double[] estimateNodeSize(PackageNode node) {
        if (node.children.isEmpty()) {
            int n = Math.max(1, node.ownBuildings.size());
            int cols = Math.max(1, (int) Math.ceil(Math.sqrt(n)));
            int rows = (int) Math.ceil((double) n / cols);
            return new double[]{
                    Math.max(MIN_PLATEAU_SIZE, cols * BUILDING_SPACING + 2 * INNER_PADDING),
                    Math.max(MIN_PLATEAU_SIZE, rows * BUILDING_SPACING + 2 * INNER_PADDING)
            };
        }
        List<PackageNode> children = computeChildrenList(node);
        int numCols = Math.max(1, (int) Math.ceil(Math.sqrt(children.size())));
        int numRows = (int) Math.ceil((double) children.size() / numCols);
        double[] colWidths = new double[numCols];
        double[] rowDepths = new double[numRows];
        for (int i = 0; i < children.size(); i++) {
            double[] cs = estimateNodeSize(children.get(i));
            colWidths[i % numCols] = Math.max(colWidths[i % numCols], cs[0]);
            rowDepths[i / numCols] = Math.max(rowDepths[i / numCols], cs[1]);
        }
        double tw = sumArr(colWidths) + CHILD_GAP * (numCols - 1);
        double td = sumArr(rowDepths) + CHILD_GAP * (numRows - 1);
        return new double[]{
                Math.max(MIN_PLATEAU_SIZE, tw + 2 * INNER_PADDING),
                Math.max(MIN_PLATEAU_SIZE, td + 2 * INNER_PADDING)
        };
    }

    /**
     * Recursively lays out a package node and all its descendants, placing
     * plateau and building objects at absolute world coordinates.
     *
     * <p>Parent plateaus always encompass all their child plateaus; children
     * are elevated by the parent's plateau thickness, creating the stacked
     * district effect the user sees.
     *
     * @param node          package node to lay out
     * @param originX       left (west) edge of the available space in world X
     * @param originZ       front (south) edge in world Z
     * @param baseY         bottom face of this node's plateau in world Y
     * @param displayDepth  1-based depth in the visible hierarchy (city base = 1)
     * @param plateauOutput accumulator — plateaus are appended here
     * @param buildingOutput accumulator — positioned buildings are appended here
     * @return {totalWidth, totalDepth} of the plateau just created
     */
    private double[] layoutNode(PackageNode node,
                                double originX, double originZ, double baseY,
                                int displayDepth,
                                List<Plateau> plateauOutput, List<Building> buildingOutput) {
        double platH = plateauHeightForDepth(displayDepth);
        double childBaseY = baseY + platH;
        double usedW;
        double usedD;
        double avgH = 0.0;

        if (node.children.isEmpty()) {
            // Leaf node: place buildings in a grid on top of this plateau.
            List<Building> batch = new ArrayList<>();
            double[] fp = layoutBuildingsGrid(
                    node.ownBuildings,
                    originX + INNER_PADDING, originZ + INNER_PADDING,
                    childBaseY, batch);
            avgH = batch.stream()
                    .map(Building::getDimensions)
                    .filter(Objects::nonNull)
                    .mapToDouble(Dimensions::getHeight)
                    .average()
                    .orElse(0.0);
            buildingOutput.addAll(batch);
            usedW = fp[0];
            usedD = fp[1];
        } else {
            // Internal node: pack children in a square-ish grid of slots,
            // each slot sized to the largest child in that column / row.
            List<PackageNode> children = computeChildrenList(node);
            int numCols = Math.max(1, (int) Math.ceil(Math.sqrt(children.size())));
            int numRows = (int) Math.ceil((double) children.size() / numCols);

            double[] colWidths = new double[numCols];
            double[] rowDepths = new double[numRows];
            for (int i = 0; i < children.size(); i++) {
                double[] cs = estimateNodeSize(children.get(i));
                colWidths[i % numCols] = Math.max(colWidths[i % numCols], cs[0]);
                rowDepths[i / numCols] = Math.max(rowDepths[i / numCols], cs[1]);
            }

            double curZ = originZ + INNER_PADDING;
            for (int row = 0; row < numRows; row++) {
                double curX = originX + INNER_PADDING;
                for (int col = 0; col < numCols; col++) {
                    int idx = row * numCols + col;
                    if (idx >= children.size()) break;
                    layoutNode(children.get(idx), curX, curZ, childBaseY,
                            displayDepth + 1, plateauOutput, buildingOutput);
                    curX += colWidths[col] + CHILD_GAP;
                }
                curZ += rowDepths[row] + CHILD_GAP;
            }
            usedW = sumArr(colWidths) + CHILD_GAP * (numCols - 1);
            usedD = sumArr(rowDepths) + CHILD_GAP * (numRows - 1);
        }

        double platW = Math.max(MIN_PLATEAU_SIZE, usedW + 2 * INNER_PADDING);
        double platD = Math.max(MIN_PLATEAU_SIZE, usedD + 2 * INNER_PADDING);
        String platName = node.fullName.isEmpty() ? "(root)" : node.fullName;

        plateauOutput.add(Plateau.builder()
                .name(platName)
                .position(Position.builder()
                        .x(originX + platW / 2.0)
                        .y(baseY + platH / 2.0)
                        .z(originZ + platD / 2.0)
                        .build())
                .dimensions(Dimensions.builder()
                        .width(platW)
                        .height(platH)
                        .depth(platD)
                        .build())
                .buildingCount(subtreeBuildingCount(node))
                .averageHeight(avgH)
                .color(plateauColorForDepth(displayDepth))
                .build());

        return new double[]{platW, platD};
    }

    /**
     * Arranges buildings in a square-ish grid starting at (originX, originZ),
     * tallest (most methods) first.  Buildings sit with their bottom face at
     * {@code baseY}.
     *
     * @return approximate {content_width, content_depth} (padding excluded)
     */
    private double[] layoutBuildingsGrid(List<Building> rawBuildings,
                                         double originX, double originZ, double baseY,
                                         List<Building> output) {
        if (rawBuildings.isEmpty()) return new double[]{0, 0};

        List<Building> sorted = rawBuildings.stream()
                .sorted(Comparator.comparingInt((Building b) -> b.getMetrics().getMethodCount()).reversed()
                        .thenComparing(Building::getName))
                .map(this::copyBuilding)
                .toList();

        int n = sorted.size();
        int cols = Math.max(1, (int) Math.ceil(Math.sqrt(n)));

        for (int i = 0; i < n; i++) {
            Building b = sorted.get(i);
            int row = i / cols;
            int col = i % cols;

            int nom = b.getMetrics().getMethodCount();
            int noa = b.getMetrics().getFieldCount();
            int loc = b.getMetrics().getLinesOfCode();
            double cyclomatic = b.getMetrics().getCyclomatic();
            double avgCyclo = nom > 0 ? cyclomatic / nom : cyclomatic;

            // Wettel CodeCity canonical encoding:
            //   Height → NOM   Width → NOA   Depth → LOC (sqrt-scaled)
            double h = Math.max(1.5, Math.min(30.0, 1.0 + nom * 0.65));
            double w = Math.max(1.2, Math.min(3.5,  1.0 + noa * 0.35));
            double d = Math.max(1.2, Math.min(3.5,  1.0 + Math.sqrt(Math.max(1.0, loc)) * 0.16));

            b.setColor(cyclomaticHeatColor(b.getType(), avgCyclo));
            b.setDimensions(Dimensions.builder().width(w).height(h).depth(d).build());
            b.setPosition(Position.builder()
                    .x(originX + col * BUILDING_SPACING)
                    .y(baseY + h / 2.0)
                    .z(originZ + row * BUILDING_SPACING)
                    .build());
            output.add(b);
        }

        int rows = (int) Math.ceil((double) n / cols);
        return new double[]{
                Math.max(0, (cols - 1) * BUILDING_SPACING + 2.5),
                Math.max(0, (rows - 1) * BUILDING_SPACING + 2.5)
        };
    }

    /** Counts all buildings in this node and every descendant. */
    private int subtreeBuildingCount(PackageNode node) {
        return node.ownBuildings.size()
                + node.children.values().stream().mapToInt(this::subtreeBuildingCount).sum();
    }

    /**
     * Plateau slab thickness per display depth.
     * Root/city-base plateaus are thicker; leaf districts are thinner — this
     * gives the city a recognisable layered silhouette.
     */
    private double plateauHeightForDepth(int displayDepth) {
        return switch (displayDepth) {
            case 1 -> 0.9;
            case 2 -> 0.7;
            case 3 -> 0.55;
            default -> 0.45;
        };
    }

    /**
     * Plateau color per display depth: dark slate at the city base, progressively
     * lighter blue toward leaf districts — mirrors Wettel's district shading.
     */
    private String plateauColorForDepth(int displayDepth) {
        return switch (displayDepth) {
            case 1 -> "#1e293b";   // city base  — dark slate
            case 2 -> "#1e3a5f";   // district   — dark blue
            case 3 -> "#1e4d7a";   // sub-district
            case 4 -> "#2d6391";   // block
            case 5 -> "#3b7ab0";   // sub-block
            default -> "#609ac4";  // lot        — light blue
        };
    }

    private double sumArr(double[] arr) {
        double s = 0;
        for (double v : arr) s += v;
        return s;
    }

    /**
     * Blends the type's base color toward orange-red as average cyclomatic
     * complexity per method rises.  A value of 1 leaves the color unchanged;
     * a value of ~8 saturates toward the hot color (#FF6B35).
     *
     * This lets the cityscape function simultaneously as a heat map: glowing
     * orange buildings are structural hotspots regardless of type.
     */
    private String cyclomaticHeatColor(BuildingType type, double avgCyclomaticPerMethod) {
        String baseHex = type.getDefaultColor();
        int rgb = Integer.parseInt(baseHex.substring(1), 16);
        int baseR = (rgb >> 16) & 0xFF;
        int baseG = (rgb >> 8) & 0xFF;
        int baseB = rgb & 0xFF;

        // Target hot color: #FF6B35
        int hotR = 0xFF, hotG = 0x6B, hotB = 0x35;

        // heat = 0 when cyclo ≤ 1 (pure sequential), = 1 when cyclo ≥ 8
        double heat = Math.min(1.0, Math.max(0.0, (avgCyclomaticPerMethod - 1.0) / 7.0));

        int r = (int) Math.round(baseR + (hotR - baseR) * heat);
        int g = (int) Math.round(baseG + (hotG - baseG) * heat);
        int b = (int) Math.round(baseB + (hotB - baseB) * heat);

        return String.format("#%02X%02X%02X", r, g, b);
    }

    private Building copyBuilding(Building source) {
        return Building.builder()
                .name(source.getName())
                .fullName(source.getFullName())
                .packageName(source.getPackageName())
                .type(source.getType())
                .metrics(source.getMetrics())
                .color(source.getColor())
                .build();
    }

    private CityMetrics buildCityMetrics(Map<String, List<Building>> buildingsByPackage, List<Building> buildings) {
        List<Double> complexities = buildings.stream()
                .map(Building::getMetrics)
                .filter(Objects::nonNull)
                .map(Metrics::getComplexity)
                .toList();

        return CityMetrics.builder()
                .totalClasses((int) buildings.stream().filter(building -> building.getType() != BuildingType.INTERFACE).count())
                .totalInterfaces((int) buildings.stream().filter(building -> building.getType() == BuildingType.INTERFACE).count())
                .totalMethods(buildings.stream().map(Building::getMetrics).mapToInt(Metrics::getMethodCount).sum())
                .totalFields(buildings.stream().map(Building::getMetrics).mapToInt(Metrics::getFieldCount).sum())
                .totalPackages(buildingsByPackage.size())
                .totalLines(buildings.stream().map(Building::getMetrics).mapToInt(Metrics::getLinesOfCode).sum())
                .averageComplexity(complexities.stream().mapToDouble(Double::doubleValue).average().orElse(0))
                .maxComplexity(complexities.stream().mapToDouble(Double::doubleValue).max().orElse(0))
                .minComplexity(complexities.stream().mapToDouble(Double::doubleValue).min().orElse(0))
                .build();
    }

    // ------------------------------------------------------------------
    // Domain model — package tree node
    // ------------------------------------------------------------------

    /**
     * One node in the package hierarchy tree.
     * Leaf nodes carry own buildings; internal nodes carry only children.
     * A node may carry both if classes sit directly in an intermediate package.
     */
    private static class PackageNode {
        /** Last dot-separated segment of the package name. */
        final String segment;
        /** Fully qualified package name (empty string for the synthetic root). */
        final String fullName;
        /** Depth in the raw tree; not the same as display depth after chain-skip. */
        final int depth;
        /** Alphabetically sorted sub-packages. */
        final TreeMap<String, PackageNode> children = new TreeMap<>();
        /** Buildings (classes/interfaces/…) declared directly in this package. */
        final List<Building> ownBuildings = new ArrayList<>();

        PackageNode(String segment, String fullName, int depth) {
            this.segment  = segment;
            this.fullName = fullName;
            this.depth    = depth;
        }
    }
}

