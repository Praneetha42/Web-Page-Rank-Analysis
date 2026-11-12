
const sections = {
    searchTab: "searchSection",
    manageTab: "manageSection",
    linkAnalysisTab: "linkAnalysisSection",
    rankingTab: "rankingSection",
    aboutTab: "aboutSection"
};

let currentSection = "searchTab";
let previousSections = [];
let rankingCalculated = false;


// =========================================
// RESET RANKING UI
// =========================================

function resetRankingUI() {

    rankingCalculated = false;

    document.getElementById("rankingStatus").textContent = "Pending";

    document.getElementById("rankingResults").replaceChildren();

    document.getElementById("topRankedPages").textContent =
        "Calculate PageRank to see the top webpages.";

    document.getElementById("highestRankedPage").textContent = "—";

    document.getElementById("averagePageRank").textContent = "—";

    document.getElementById("rankingDistribution").textContent =
        "Calculate PageRank to view the distribution.";
}


// =========================================
// SECTION NAVIGATION
// =========================================

function showSection(tabId) {

    if (currentSection !== tabId) {
        previousSections.push(currentSection);
    }

    currentSection = tabId;

    Object.values(sections).forEach(sectionId => {
        document.getElementById(sectionId).classList.add("hidden");
    });

    document.getElementById(sections[tabId]).classList.remove("hidden");

    document.querySelectorAll(".nav-btn").forEach(button => {
        button.classList.remove("active");
    });

    document.getElementById(tabId).classList.add("active");

    const titles = {
        searchTab: "Dashboard",
        manageTab: "Manage Pages",
        linkAnalysisTab: "Link Analysis",
        rankingTab: "PageRank",
        aboutTab: "About Project"
    };

    document.getElementById("currentPageTitle").textContent = titles[tabId];
}


Object.keys(sections).forEach(tabId => {

    document.getElementById(tabId).addEventListener("click", function () {
        showSection(tabId);
    });

});


document.getElementById("backButton").addEventListener("click", function () {

    if (previousSections.length > 0) {

        const previousTab = previousSections.pop();

        const savedHistory = [...previousSections];

        showSection(previousTab);

        previousSections = savedHistory;

    } else {

        showSection("searchTab");

    }

});


// =========================================
// ADD WEBPAGE
// =========================================

async function addWebpage() {

    const pageName = document.getElementById("pageName").value.trim();

    if (pageName === "") {
        alert("Please enter a webpage name!");
        return;
    }

    const formData = new URLSearchParams();
    formData.append("pageName", pageName);

    try {

        const response = await fetch("/api/add-page", {
            method: "POST",
            body: formData
        });

        const message = await response.text();

        if (response.ok) {

            alert(message);

            addRecentActivity("Added webpage: " + pageName, "🌐");

            document.getElementById("pageName").value = "";

            resetRankingUI();

            loadPages();
            renderLinkGraph();
            loadDashboardStats();

        } else {

            alert(message);

        }

    } catch (error) {

        alert("Could not connect to C server!");
        console.error(error);

    }
}


document.getElementById("addPageButton")
    .addEventListener("click", addWebpage);


document.getElementById("pageName")
    .addEventListener("keydown", function(event) {

        if (event.key === "Enter") {
            addWebpage();
        }

    });


// =========================================
// LOAD AND DISPLAY WEBPAGES
// =========================================

async function loadPages() {

    try {

        const response = await fetch("/api/pages");

        if (!response.ok) {
            throw new Error("Could not load webpages");
        }

        const data = await response.json();

        const pageList = document.getElementById("pageList");

        const sourceSelect = document.getElementById("sourcePage");
        const destinationSelect = document.getElementById("destinationPage");

        sourceSelect.replaceChildren();
        destinationSelect.replaceChildren();

        sourceSelect.add(new Option("Select source page", ""));
        destinationSelect.add(new Option("Select destination page", ""));

        data.pages.forEach(function(page, index) {

            sourceSelect.add(new Option(page, index));
            destinationSelect.add(new Option(page, index));

        });

        pageList.replaceChildren();

        if (data.pages.length === 0) {

            pageList.textContent = "No webpages added yet.";
            return;

        }

        const table = document.createElement("table");
        table.className = "webpage-table";

        const thead = document.createElement("thead");
        const headerRow = document.createElement("tr");

        ["S.No", "Webpage Name", "Status", "Actions"].forEach(function(title) {

            const th = document.createElement("th");
            th.textContent = title;

            headerRow.appendChild(th);

        });

        thead.appendChild(headerRow);
        table.appendChild(thead);

        const tbody = document.createElement("tbody");

        data.pages.forEach(function(page, index) {

            const row = document.createElement("tr");

            const numberCell = document.createElement("td");
            numberCell.textContent = index + 1;

            const nameCell = document.createElement("td");
            nameCell.textContent = page;

            const statusCell = document.createElement("td");
            statusCell.textContent = "Registered";

            const actionCell = document.createElement("td");


            // EDIT BUTTON

            const editButton = document.createElement("button");

            editButton.textContent = "Edit";
            editButton.className = "edit-page-button";

            editButton.addEventListener("click", async function() {

                const newName = prompt(
                    "Enter the new webpage name:",
                    page
                );

                if (newName === null) return;

                const updatedName = newName.trim();

                if (updatedName === "") {

                    alert("Webpage name cannot be empty!");
                    return;

                }

                if (updatedName.length >= 100) {

                    alert("Webpage name must be less than 100 characters!");
                    return;

                }

                if (updatedName === page) return;

                const formData = new URLSearchParams();

                formData.append("pageIndex", index);
                formData.append("newPageName", updatedName);

                try {

                    const editResponse = await fetch("/api/edit-page", {
                        method: "POST",
                        body: formData
                    });

                    const message = await editResponse.text();

                    if (!editResponse.ok) {

                        alert(message);
                        return;

                    }

                    alert(message);

                    addRecentActivity(
                        "Renamed webpage: " + page + " → " + updatedName,
                        "✏️"
                    );

                    loadPages();
                    loadLinks();
                    renderLinkGraph();
                    loadDashboardStats();

                    resetRankingUI();

                } catch (error) {

                    alert("Could not connect to C server!");
                    console.error(error);

                }

            });


            // DELETE BUTTON

            const deleteButton = document.createElement("button");

            deleteButton.textContent = "Delete";
            deleteButton.className = "delete-page-button";

            deleteButton.addEventListener("click", async function() {

                const confirmDelete = confirm(
                    "Delete webpage '" + page +
                    "'?\nIts connections will also be removed."
                );

                if (!confirmDelete) return;

                const formData = new URLSearchParams();
                formData.append("pageIndex", index);

                try {

                    const deleteResponse = await fetch("/api/delete-page", {
                        method: "POST",
                        body: formData
                    });

                    const message = await deleteResponse.text();

                    if (!deleteResponse.ok) {

                        alert(message);
                        return;

                    }

                    alert(message);

                    addRecentActivity(
                        "Deleted webpage: " + page,
                        "🗑️"
                    );

                    loadPages();
                    loadLinks();
                    renderLinkGraph();
                    loadDashboardStats();

                    resetRankingUI();

                } catch (error) {

                    alert("Could not connect to C server!");
                    console.error(error);

                }

            });


            actionCell.append(editButton, deleteButton);

            row.append(
                numberCell,
                nameCell,
                statusCell,
                actionCell
            );

            tbody.appendChild(row);

        });

        table.appendChild(tbody);
        pageList.appendChild(table);

    } catch (error) {

        console.error("Error loading webpages:", error);

    }

}


// Load webpages when website opens

loadPages();


// =========================================
// ADD CONNECTION
// =========================================

async function addConnection() {

    const source = document.getElementById("sourcePage").value;
    const destination = document.getElementById("destinationPage").value;

    if (source === "" || destination === "") {

        alert("Please select both webpages!");
        return;

    }

    const formData = new URLSearchParams();

    formData.append("source", source);
    formData.append("destination", destination);

    try {

        const response = await fetch("/api/add-link", {
            method: "POST",
            body: formData
        });

        const message = await response.text();

        alert(message);

        if (response.ok) {

            addRecentActivity(
                "Created link: " + source + " → " + destination,
                "🔗"
            );

            document.getElementById("sourcePage").value = "";
            document.getElementById("destinationPage").value = "";

            loadLinks();
            renderLinkGraph();
            loadDashboardStats();

            resetRankingUI();

        }

    } catch (error) {

        alert("Could not connect to C server!");
        console.error(error);

    }

}


document.getElementById("addLinkButton")
    .addEventListener("click", addConnection);


// =========================================
// LOAD AND DISPLAY CONNECTIONS
// =========================================

async function loadLinks() {

    try {

        const response = await fetch("/api/links");

        if (!response.ok) {
            throw new Error("Could not load connections");
        }

        const data = await response.json();

        const linkList = document.getElementById("linkList");

        linkList.replaceChildren();

        if (data.links.length === 0) {

            const emptyMessage = document.createElement("p");

            emptyMessage.textContent = "No connections added yet.";
            emptyMessage.className = "empty-links-message";

            linkList.appendChild(emptyMessage);

            return;

        }


        // Connection summary

        const summary = document.createElement("div");
        summary.className = "connection-summary";

        const count = document.createElement("strong");
        count.textContent = data.links.length;

        const label = document.createElement("span");
        label.textContent = "Total webpage connections";

        summary.append(count, label);

        linkList.appendChild(summary);


        // Connection table

        const table = document.createElement("table");
        table.className = "connection-table";

        const thead = document.createElement("thead");
        const headerRow = document.createElement("tr");

        ["No.", "Source Webpage", "Direction", "Destination Webpage"].forEach(
            function(title) {

                const th = document.createElement("th");
                th.textContent = title;

                headerRow.appendChild(th);

            }
        );

        thead.appendChild(headerRow);
        table.appendChild(thead);

        const tbody = document.createElement("tbody");

        data.links.forEach(function(link, index) {

            const row = document.createElement("tr");

            const numberCell = document.createElement("td");
            numberCell.textContent = String(index + 1);

            const sourceCell = document.createElement("td");
            sourceCell.textContent = link.source;

            const arrowCell = document.createElement("td");
            arrowCell.className = "connection-arrow";
            arrowCell.textContent = "→";

            const destinationCell = document.createElement("td");
            destinationCell.textContent = link.destination;

            row.append(
                numberCell,
                sourceCell,
                arrowCell,
                destinationCell
            );

            tbody.appendChild(row);

        });

        table.appendChild(tbody);

        const wrapper = document.createElement("div");
        wrapper.className = "connection-table-wrapper";

        wrapper.appendChild(table);

        linkList.appendChild(wrapper);

    } catch (error) {

        console.error("Error loading connections:", error);

    }

}


loadLinks();


// =========================================
// CALCULATE PAGERANK
// =========================================

async function calculateRanking() {

    try {

        const response = await fetch("/api/ranking");

        if (!response.ok) {

            const message = await response.text();

            alert(message);
            return;

        }

        const data = await response.json();

        rankingCalculated = true;

        document.getElementById("rankingStatus").textContent = "Calculated";

        const rankingResults =
            document.getElementById("rankingResults");

        rankingResults.replaceChildren();


        // Ranking table

        const table = document.createElement("table");
        table.className = "ranking-table";

        const header = document.createElement("thead");

        header.innerHTML = `
            <tr>
                <th>Rank</th>
                <th>Webpage Name</th>
                <th>PageRank Score</th>
            </tr>
        `;

        table.appendChild(header);

        const tbody = document.createElement("tbody");

        data.ranking.forEach(function(page) {

            const row = document.createElement("tr");

            if (page.position === 1) {
                row.classList.add("top-ranked");
            }

            row.innerHTML = `
                <td>${page.position}</td>
                <td></td>
                <td>${page.score.toFixed(8)}</td>
            `;

            row.children[1].textContent = page.name;

            tbody.appendChild(row);

        });

        table.appendChild(tbody);
        rankingResults.appendChild(table);


        // Update dashboard analytics

        displayTopRankedPages(data.ranking);

        displayDashboardAnalytics(data.ranking);

        loadDashboardStats();

    } catch (error) {

        alert("Could not connect to C server!");
        console.error(error);

    }

}


// Calculate button

document.getElementById("calculateButton")
    .addEventListener("click", calculateRanking);


// =========================================
// DISPLAY TOP 3 RANKED PAGES
// =========================================

function displayTopRankedPages(ranking) {

    const container = document.getElementById("topRankedPages");

    container.replaceChildren();

    if (ranking.length === 0) {

        container.textContent = "No ranked webpages available.";
        return;

    }

    const topThree = ranking.slice(0, 3);

    topThree.forEach(function(page) {

        const card = document.createElement("div");
        card.className = "top-page-item";

        const rank = document.createElement("span");
        rank.className = "top-page-rank";
        rank.textContent = "#" + page.position;

        const name = document.createElement("strong");
        name.className = "top-page-name";
        name.textContent = page.name;

        const score = document.createElement("span");
        score.className = "top-page-score";
        score.textContent = page.score.toFixed(8);

        card.append(rank, name, score);

        container.appendChild(card);

    });

}


// =========================================
// DASHBOARD ANALYTICS
// =========================================

function displayDashboardAnalytics(ranking) {

    const highestElement =
        document.getElementById("highestRankedPage");

    const averageElement =
        document.getElementById("averagePageRank");

    const chartContainer =
        document.getElementById("rankingDistribution");

    highestElement.textContent = "—";
    averageElement.textContent = "—";

    chartContainer.replaceChildren();

    if (!ranking || ranking.length === 0) {

        chartContainer.textContent =
            "No ranking data available.";

        return;

    }


    // Find highest ranked webpage

    const highestPage = ranking.reduce(
        (best, page) =>
            page.score > best.score ? page : best
    );

    highestElement.textContent = highestPage.name;


    // Calculate average PageRank

    const totalScore = ranking.reduce(
        (sum, page) => sum + page.score,
        0
    );

    const averageScore = totalScore / ranking.length;

    averageElement.textContent =
        averageScore.toFixed(8);


    // Create ranking distribution

    const maximumScore = Math.max(
        ...ranking.map(page => page.score)
    );

    ranking.forEach(function(page) {

        const item = document.createElement("div");
        item.className = "distribution-item";

        const label = document.createElement("div");
        label.className = "distribution-label";
        label.textContent = page.name;

        const score = document.createElement("span");
        score.textContent = page.score.toFixed(8);

        const barBackground =
            document.createElement("div");

        barBackground.className = "distribution-bar";

        const barFill = document.createElement("div");
        barFill.className = "distribution-fill";

        const percentage = maximumScore > 0
            ? (page.score / maximumScore) * 100
            : 0;

        barFill.style.width = percentage + "%";

        barBackground.appendChild(barFill);

        const details = document.createElement("div");
        details.className = "distribution-details";

        details.append(label, score);

        item.append(details, barBackground);

        chartContainer.appendChild(item);

    });

}


// =========================================
// SEARCH WEBPAGE
// =========================================

async function searchWebpage() {

    const searchName =
        document.getElementById("searchName").value.trim();

    const resultArea =
        document.getElementById("searchResult");

    if (searchName === "") {

        alert("Please enter a webpage name!");
        return;

    }

    const formData = new URLSearchParams();

    formData.append("pageName", searchName);

    try {

        const response = await fetch("/api/search", {
            method: "POST",
            body: formData
        });

        if (!response.ok) {

            const message = await response.text();

            resultArea.textContent = message;

            return;

        }

        const data = await response.json();

        resultArea.innerHTML = `
            <div class="search-result-card">
                <span class="result-status">Webpage Found</span>
                <h2></h2>

                <p>
                    <strong>PageRank Score:</strong>
                    ${data.score.toFixed(8)}
                </p>

                <p class="ranking-position">
                    <strong>Ranking Position:</strong>
                    <span>#${data.position}</span>
                </p>
            </div>
        `;

        resultArea.querySelector("h2").textContent = data.name;

    } catch (error) {

        resultArea.textContent = "Could not connect to C server!";

        console.error(error);

    }

}


document.getElementById("searchButton")
    .addEventListener("click", searchWebpage);


document.getElementById("searchName")
    .addEventListener("keydown", function(event) {

        if (event.key === "Enter") {
            searchWebpage();
        }

    });


// =========================================
// LOAD DASHBOARD STATISTICS
// =========================================

async function loadDashboardStats() {

    try {

        const response = await fetch("/api/stats");

        if (!response.ok) {
            throw new Error("Could not load dashboard statistics");
        }

        const data = await response.json();

        document.getElementById("totalPages").textContent =
            data.totalPages;

        document.getElementById("totalLinks").textContent =
            data.totalLinks;

        document.getElementById("rankingStatus").textContent =
            rankingCalculated ? "Calculated" : "Pending";

    } catch (error) {

        console.error(error);

    }

}


loadDashboardStats();


// =========================================
// LINK ANALYSIS GRAPH
// =========================================

async function renderLinkGraph() {

    try {

        const [pagesResponse, linksResponse] = await Promise.all([
            fetch("/api/pages"),
            fetch("/api/links")
        ]);

        if (!pagesResponse.ok || !linksResponse.ok) {
            throw new Error("Could not load graph data");
        }

        const pagesData = await pagesResponse.json();
        const linksData = await linksResponse.json();

        const pages = pagesData.pages;
        const links = linksData.links;

        const container = document.getElementById("graphContainer");

        container.replaceChildren();

        if (pages.length === 0) {

            container.textContent =
                "No webpages available to display.";

            return;

        }

        const NS = "http://www.w3.org/2000/svg";

        const svg = document.createElementNS(NS, "svg");

        svg.setAttribute("viewBox", "0 0 900 450");
        svg.setAttribute("width", "100%");
        svg.setAttribute("role", "img");
        svg.setAttribute("aria-label", "Webpage connection graph");


        // Graph dimensions

        const centerX = 450;
        const centerY = 225;

        const radius = Math.min(
            155,
            40 + pages.length * 18
        );

        const nodeWidth = 110;
        const nodeHeight = 46;

        const positions = {};


        // Calculate node positions

        pages.forEach(function(page, index) {

            const angle =
                (2 * Math.PI * index / pages.length) - Math.PI / 2;

            positions[page] = {

                x: centerX + radius * Math.cos(angle),

                y: centerY + radius * Math.sin(angle)

            };

        });


        // =========================================
        // SVG ARROW AND GLOW DEFINITIONS
        // =========================================

        const defs = document.createElementNS(NS, "defs");


        // Arrow marker

        const marker = document.createElementNS(NS, "marker");

        marker.setAttribute("id", "arrow");
        marker.setAttribute("markerWidth", "10");
        marker.setAttribute("markerHeight", "10");
        marker.setAttribute("refX", "8");
        marker.setAttribute("refY", "3");
        marker.setAttribute("orient", "auto");

        const arrow = document.createElementNS(NS, "path");

        arrow.setAttribute("d", "M0,0 L0,6 L9,3 z");
        arrow.setAttribute("fill", "#64748b");

        marker.appendChild(arrow);

        defs.appendChild(marker);


        // Glow filter

        const glowFilter = document.createElementNS(NS, "filter");

        glowFilter.setAttribute("id", "nodeGlow");
        glowFilter.setAttribute("x", "-50%");
        glowFilter.setAttribute("y", "-50%");
        glowFilter.setAttribute("width", "200%");
        glowFilter.setAttribute("height", "200%");

        const blur = document.createElementNS(NS, "feGaussianBlur");

        blur.setAttribute("stdDeviation", "4");
        blur.setAttribute("result", "coloredBlur");

        const merge = document.createElementNS(NS, "feMerge");

        const glow = document.createElementNS(NS, "feMergeNode");
        glow.setAttribute("in", "coloredBlur");

        const original = document.createElementNS(NS, "feMergeNode");
        original.setAttribute("in", "SourceGraphic");

        merge.append(glow, original);

        glowFilter.append(blur, merge);

        defs.appendChild(glowFilter);

        svg.appendChild(defs);


        // =========================================
        // DRAW CONNECTION LINES
        // =========================================

        const connectionLines = [];

        links.forEach(function(link) {

            const source = positions[link.source];

            const destination = positions[link.destination];

            if (!source || !destination) return;

            const dx = destination.x - source.x;
            const dy = destination.y - source.y;

            if (dx === 0 && dy === 0) return;


            const sourceScale = Math.min(

                (nodeWidth / 2) /
                Math.max(Math.abs(dx), 0.001),

                (nodeHeight / 2) /
                Math.max(Math.abs(dy), 0.001)

            );

            const destinationScale = sourceScale;

            const line = document.createElementNS(NS, "line");

            line.setAttribute(
                "x1",
                source.x + dx * sourceScale
            );

            line.setAttribute(
                "y1",
                source.y + dy * sourceScale
            );

            line.setAttribute(
                "x2",
                destination.x - dx * destinationScale
            );

            line.setAttribute(
                "y2",
                destination.y - dy * destinationScale
            );

            line.setAttribute("stroke", "#64748b");
            line.setAttribute("stroke-width", "2");
            line.setAttribute("marker-end", "url(#arrow)");

            svg.appendChild(line);

            connectionLines.push({

                source: link.source,

                line: line

            });

        });


        // =========================================
        // DRAW ROUNDED RECTANGLE WEBPAGE NODES
        // =========================================

        pages.forEach(function(page) {

            const position = positions[page];

            const rect = document.createElementNS(NS, "rect");

            rect.setAttribute("data-page", page);

            rect.setAttribute(
                "x",
                position.x - nodeWidth / 2
            );

            rect.setAttribute(
                "y",
                position.y - nodeHeight / 2
            );

            rect.setAttribute("width", nodeWidth);
            rect.setAttribute("height", nodeHeight);

            rect.setAttribute("rx", "10");
            rect.setAttribute("ry", "10");

            rect.setAttribute("fill", "#2563eb");
            rect.setAttribute("stroke", "#60a5fa");
            rect.setAttribute("stroke-width", "1.5");

            rect.setAttribute("filter", "url(#nodeGlow)");

            rect.style.cursor = "pointer";
            rect.style.transition = "fill 0.3s ease";


            // Webpage name inside rectangle

            const label = document.createElementNS(NS, "text");

            label.setAttribute("x", position.x);
            label.setAttribute("y", position.y);

            label.setAttribute("text-anchor", "middle");
            label.setAttribute("dominant-baseline", "middle");

            label.setAttribute("fill", "#ffffff");
            label.setAttribute("font-size", "12");
            label.setAttribute("font-weight", "600");

            label.style.pointerEvents = "none";


            const displayName = page.length > 16
                ? page.substring(0, 13) + "..."
                : page;

            label.textContent = displayName;


            // Show full name on hover

            const title = document.createElementNS(NS, "title");

            title.textContent = page;

            rect.appendChild(title);


            // =========================================
            // NODE CLICK FUNCTIONALITY
            // =========================================

            rect.addEventListener("click", async function() {


                // Reset all nodes

                document.querySelectorAll(
                    "#graphContainer rect[data-page]"
                ).forEach(function(node) {

                    node.setAttribute("fill", "#2563eb");
                    node.setAttribute("stroke", "#60a5fa");

                });


                // Reset connection arrows

                connectionLines.forEach(function(item) {

                    item.line.setAttribute("stroke", "#64748b");

                    item.line.setAttribute("stroke-width", "2");

                });


                // Highlight selected webpage

                rect.setAttribute("fill", "#f97316");

                rect.setAttribute("stroke", "#fdba74");


                // Find directly connected webpages

                const connectedPages = new Set();

                links.forEach(function(link) {

                    if (link.source === page) {
                        connectedPages.add(link.destination);
                    }

                    if (link.destination === page) {
                        connectedPages.add(link.source);
                    }

                });


                // Highlight connected webpages

                document.querySelectorAll(
                    "#graphContainer rect[data-page]"
                ).forEach(function(node) {

                    const nodePage = node.getAttribute("data-page");

                    if (connectedPages.has(nodePage)) {

                        node.setAttribute("fill", "#16a34a");

                        node.setAttribute("stroke", "#86efac");

                    }

                });


                // Highlight outgoing arrows

                connectionLines.forEach(function(item) {

                    if (item.source === page) {

                        item.line.setAttribute("stroke", "#f97316");

                        item.line.setAttribute("stroke-width", "4");

                    }

                });


                // =========================================
                // DISPLAY SELECTED WEBPAGE DETAILS
                // =========================================

                const details = document.getElementById(
                    "selectedPageDetails"
                );

                const outgoingPages = links.filter(
                    link => link.source === page
                );

                const incomingPages = links.filter(
                    link => link.destination === page
                );

                const destinations = outgoingPages.map(
                    link => link.destination
                );

                const sources = incomingPages.map(
                    link => link.source
                );


                try {

                    const rankingResponse = await fetch("/api/ranking");

                    if (!rankingResponse.ok) {

                        throw new Error("Could not load PageRank data");

                    }

                    const rankingData = await rankingResponse.json();

                    const pageRankInfo = rankingData.ranking.find(
                        item => item.name === page
                    );


                    details.replaceChildren();


                    function addDetail(labelText, valueText, className) {

                        const paragraph = document.createElement("p");

                        if (className) {
                            paragraph.className = className;
                        }

                        const strong = document.createElement("strong");

                        strong.textContent = labelText + ": ";

                        paragraph.append(
                            strong,
                            document.createTextNode(valueText)
                        );

                        details.appendChild(paragraph);

                    }


                    const heading = document.createElement("h3");

                    heading.textContent = "Selected Webpage";

                    details.appendChild(heading);


                    addDetail("Name", page);


                    addDetail(
                        "PageRank Score",

                        pageRankInfo
                            ? pageRankInfo.score.toFixed(8)
                            : "Not available",

                        "detail-score"
                    );


                    addDetail(
                        "Ranking Position",

                        pageRankInfo
                            ? "#" + pageRankInfo.position
                            : "Not available",

                        "detail-rank"
                    );


                    addDetail(
                        "Outgoing Connections",
                        String(destinations.length)
                    );


                    addDetail(
                        "Connected To",

                        destinations.length > 0
                            ? destinations.join(", ")
                            : "None"
                    );


                    addDetail(
                        "Incoming Connections",
                        String(sources.length)
                    );


                    addDetail(
                        "Linked From",

                        sources.length > 0
                            ? sources.join(", ")
                            : "None"
                    );


                } catch (error) {

                    console.error("Selected webpage error:", error);

                    details.textContent =
                        "Could not load selected webpage details.";

                }

            });


            svg.appendChild(rect);

            svg.appendChild(label);

        });


        // =========================================
        // DISPLAY COMPLETED GRAPH
        // =========================================

        container.appendChild(svg);


        // =========================================
        // RESET GRAPH BUTTON
        // =========================================

        const resetButton = document.getElementById("resetGraphButton");

        resetButton.onclick = function() {


            // Reset webpage nodes

            document.querySelectorAll(
                "#graphContainer rect[data-page]"
            ).forEach(function(node) {

                node.setAttribute("fill", "#2563eb");

                node.setAttribute("stroke", "#60a5fa");

            });


            // Reset connection arrows

            connectionLines.forEach(function(item) {

                item.line.setAttribute("stroke", "#64748b");

                item.line.setAttribute("stroke-width", "2");

            });


            // Reset selected webpage details

            document.getElementById(
                "selectedPageDetails"
            ).textContent =
                "Click a webpage node to view its details.";

        };


    } catch (error) {

        console.error("Graph error:", error);

    }

}


// Display graph when page loads

renderLinkGraph();


// =========================================
// RECENT ACTIVITY
// =========================================

function addRecentActivity(message, icon) {

    const container = document.getElementById("recentActivity");

    if (!container) return;

    const emptyMessage = container.querySelector("p");

    if (emptyMessage) {
        container.replaceChildren();
    }

    const item = document.createElement("div");

    item.className = "activity-item";


    const activityIcon = document.createElement("div");

    activityIcon.className = "activity-icon";

    activityIcon.textContent = icon;


    const activityMessage = document.createElement("div");

    activityMessage.className = "activity-message";

    activityMessage.textContent = message;


    const activityTime = document.createElement("span");

    activityTime.className = "activity-time";

    activityTime.textContent = new Date().toLocaleTimeString();


    item.append(
        activityIcon,
        activityMessage,
        activityTime
    );


    container.prepend(item);


    // Keep only the latest 5 activities

    while (container.children.length > 5) {

        container.lastElementChild.remove();

    }

}


// =========================================
// QUICK ACTIONS FUNCTIONALITY
// =========================================


// QUICK ACTION 1: ADD WEBPAGE

document.getElementById("quickAddPage")
    .addEventListener("click", function() {

        showSection("manageTab");

        document.getElementById("pageName").focus();

    });


// QUICK ACTION 2: CREATE CONNECTION

document.getElementById("quickAddConnection")
    .addEventListener("click", function() {

        showSection("manageTab");

        document.getElementById("sourcePage").focus();

    });


// QUICK ACTION 3: CALCULATE PAGERANK

document.getElementById("quickCalculateRanking")
    .addEventListener("click", function() {

        showSection("rankingTab");

        calculateRanking();

    });
