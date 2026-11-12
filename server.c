
#include <stdio.h>
#include <string.h>
#include <stdlib.h>
#include "mongoose.h"

/* Reuse the existing C project */
#define main console_main
#include "main.c"
#undef main

static void appendJsonString(char *buffer, size_t capacity,
                             size_t *pos, const char *value) {

    *pos += snprintf(buffer + *pos, capacity - *pos, "\"");

    for (const unsigned char *p = (const unsigned char *) value;
         *p != '\0' && *pos < capacity; p++) {

        if (*p == '"' || *p == '\\') {
            *pos += snprintf(buffer + *pos, capacity - *pos,
                             "\\%c", *p);
        }
        else if (*p < 32) {
            *pos += snprintf(buffer + *pos, capacity - *pos,
                             "\\u%04x", *p);
        }
        else {
            buffer[(*pos)++] = (char) *p;
            buffer[*pos] = '\0';
        }
    }

    *pos += snprintf(buffer + *pos, capacity - *pos, "\"");
}

static void webHandler(struct mg_connection *c, int ev,
                      void *ev_data) {

    if (ev != MG_EV_HTTP_MSG) return;

    struct mg_http_message *hm =
        (struct mg_http_message *) ev_data;

/* Website: Get all registered webpages */
if (mg_strcmp(hm->uri, mg_str("/api/pages")) == 0) {

    char json[MAX_PAGES * NAME_SIZE * 6 + 32];
    size_t pos = 0;

    pos += snprintf(json + pos, sizeof(json) - pos,
                    "{\"pages\":[");

    for (int i = 0; i < pageCount; i++) {

        if (i > 0) {
            pos += snprintf(json + pos, sizeof(json) - pos, ",");
        }

        appendJsonString(json, sizeof(json), &pos, pages[i]);
    }

    snprintf(json + pos, sizeof(json) - pos, "]}");

    mg_http_reply(c, 200,
                  "Content-Type: application/json\r\n",
                  "%s", json);
    return;
}

/* Website: Edit Webpage API */
if (mg_strcmp(hm->uri, mg_str("/api/edit-page")) == 0) {

    char pageIndexText[16] = "";
    char newPageName[NAME_SIZE] = "";

    if (mg_http_get_var(&hm->body, "pageIndex",
                        pageIndexText, sizeof(pageIndexText)) <= 0 ||
        mg_http_get_var(&hm->body, "newPageName",
                        newPageName, sizeof(newPageName)) <= 0) {

        mg_http_reply(c, 400, "Content-Type: text/plain\r\n",
                      "Please provide webpage index and name");
        return;
    }

    char *end;
    long index = strtol(pageIndexText, &end, 10);

    if (*end != '\0' || index < 0 || index >= pageCount) {
        mg_http_reply(c, 400, "Content-Type: text/plain\r\n",
                      "Invalid webpage selection");
        return;
    }

    /* Check duplicate webpage names */
    for (int i = 0; i < pageCount; i++) {
        if (i != index && strcmp(pages[i], newPageName) == 0) {
            mg_http_reply(c, 409, "Content-Type: text/plain\r\n",
                          "Webpage name already exists");
            return;
        }
    }

    /* Update webpage name */
    snprintf(pages[index], NAME_SIZE, "%s", newPageName);

    pagerankCalculated = 0;
    saveData();

    mg_http_reply(c, 200, "Content-Type: text/plain\r\n",
                  "Webpage updated successfully");

    return;
}

/* Website: Delete Webpage API */
if (mg_strcmp(hm->uri, mg_str("/api/delete-page")) == 0) {

    char pageIndexText[16] = "";

    if (mg_http_get_var(&hm->body, "pageIndex",
                        pageIndexText, sizeof(pageIndexText)) <= 0) {

        mg_http_reply(c, 400, "Content-Type: text/plain\r\n",
                      "Missing webpage index");
        return;
    }

    char *end;
    long index = strtol(pageIndexText, &end, 10);

    if (*end != '\0' || index < 0 || index >= pageCount) {

        mg_http_reply(c, 400, "Content-Type: text/plain\r\n",
                      "Invalid webpage index");
        return;
    }

    /* Shift webpage names */
    for (int i = index; i < pageCount - 1; i++) {
        strcpy(pages[i], pages[i + 1]);
    }

    /* Shift link matrix rows */
    for (int i = index; i < pageCount - 1; i++) {
        for (int j = 0; j < pageCount; j++) {
            links[i][j] = links[i + 1][j];
        }
    }

    /* Shift link matrix columns */
    for (int i = 0; i < pageCount - 1; i++) {
        for (int j = index; j < pageCount - 1; j++) {
            links[i][j] = links[i][j + 1];
        }
    }

    pageCount--;

    /* Clear unused webpage and link data */
    pages[pageCount][0] = '\0';

    for (int i = 0; i < MAX_PAGES; i++) {
        links[pageCount][i] = 0;
        links[i][pageCount] = 0;
    }

    pagerankCalculated = 0;

    saveData();

    mg_http_reply(c, 200, "Content-Type: text/plain\r\n",
                  "Webpage deleted successfully");

    return;
}

/* Website: Add Connection API */
if (mg_strcmp(hm->uri, mg_str("/api/add-link")) == 0) {

    char sourceText[16] = "";
    char destinationText[16] = "";

    if (mg_http_get_var(&hm->body, "source",
                        sourceText, sizeof(sourceText)) <= 0 ||
        mg_http_get_var(&hm->body, "destination",
                        destinationText, sizeof(destinationText)) <= 0) {

        mg_http_reply(c, 400, "Content-Type: text/plain\r\n",
                      "Please select both webpages");
        return;
    }

    char *end1, *end2;

    long source = strtol(sourceText, &end1, 10);
    long destination = strtol(destinationText, &end2, 10);

    if (*end1 != '\0' || *end2 != '\0' ||
        source < 0 || source >= pageCount ||
        destination < 0 || destination >= pageCount) {

        mg_http_reply(c, 400, "Content-Type: text/plain\r\n",
                      "Invalid webpage selection");
        return;
    }

    if (source == destination) {
        mg_http_reply(c, 400, "Content-Type: text/plain\r\n",
                      "A webpage cannot connect to itself");
        return;
    }

    if (links[source][destination] == 1) {
        mg_http_reply(c, 409, "Content-Type: text/plain\r\n",
                      "Connection already exists");
        return;
    }

    links[source][destination] = 1;
    pagerankCalculated = 0;

    saveData();

    mg_http_reply(c, 200, "Content-Type: text/plain\r\n",
                  "Connection added successfully");

    return;
}

        /* Website: Add Webpage API */
    if (mg_strcmp(hm->uri, mg_str("/api/add-page")) == 0) {

        char name[NAME_SIZE];

        mg_http_get_var(&hm->body, "pageName",
                name, sizeof(name));

        if (strlen(name) == 0) {
            mg_http_reply(c, 400, "Content-Type: text/plain\r\n",
                          "Webpage name is required");
            return;
        }

        if (pageCount >= MAX_PAGES) {
            mg_http_reply(c, 400, "Content-Type: text/plain\r\n",
                          "Maximum pages reached");
            return;
        }

        for (int i = 0; i < pageCount; i++) {
            if (strcmp(pages[i], name) == 0) {
                mg_http_reply(c, 409, "Content-Type: text/plain\r\n",
                              "Webpage already exists");
                return;
            }
        }

        strcpy(pages[pageCount], name);
        pageCount++;
        pagerankCalculated = 0;

        saveData();

        mg_http_reply(c, 200, "Content-Type: text/plain\r\n",
                      "Webpage added successfully");
        return;
    }

    /* Website: Display Link Structure API */
    if (mg_strcmp(hm->uri, mg_str("/api/links")) == 0) {

        size_t capacity =
            (size_t) MAX_PAGES * MAX_PAGES *
            (2 * NAME_SIZE + 64) + 32;

        char *json = malloc(capacity);

        if (json == NULL) {
            mg_http_reply(c, 500, "", "Memory allocation failed");
            return;
        }

        size_t pos = 0;

        pos += snprintf(json + pos, capacity - pos,
                        "{\"links\":[");

        int first = 1;

        for (int i = 0; i < pageCount; i++) {
            for (int j = 0; j < pageCount; j++) {

                if (links[i][j] == 1) {

                    if (!first) {
                        pos += snprintf(json + pos,
                                        capacity - pos, ",");
                    }

                    pos += snprintf(json + pos,
                                    capacity - pos,
                                    "{\"source\":");

                    appendJsonString(json, capacity,
                                     &pos, pages[i]);

                    pos += snprintf(json + pos,
                                    capacity - pos,
                                    ",\"destination\":");

                    appendJsonString(json, capacity,
                                     &pos, pages[j]);

                    pos += snprintf(json + pos,
                                    capacity - pos, "}");

                    first = 0;
                }
            }
        }

        snprintf(json + pos, capacity - pos, "]}");

        mg_http_reply(c, 200,
                      "Content-Type: application/json\r\n",
                      "%s", json);

        free(json);
        return;
    }

    /* Website: Calculate and Display PageRank */
    if (mg_strcmp(hm->uri, mg_str("/api/ranking")) == 0) {

        if (pageCount == 0) {
            mg_http_reply(c, 400,
                          "Content-Type: text/plain\r\n",
                          "No webpages available");
            return;
        }

        /* Use the original C PageRank algorithm */
        calculatePageRank();

        int order[MAX_PAGES];

        /* Store webpage indexes */
        for (int i = 0; i < pageCount; i++) {
            order[i] = i;
        }

        /* Sort indexes by PageRank score */
        for (int i = 0; i < pageCount - 1; i++) {
            for (int j = 0; j < pageCount - i - 1; j++) {

                if (rankScore[order[j]] <
                    rankScore[order[j + 1]]) {

                    int temp = order[j];
                    order[j] = order[j + 1];
                    order[j + 1] = temp;
                }
            }
        }

        char json[MAX_PAGES * (NAME_SIZE * 6 + 100) + 32];
        size_t pos = 0;

        pos += snprintf(json + pos, sizeof(json) - pos,
                        "{\"ranking\":[");

        for (int i = 0; i < pageCount; i++) {

            if (i > 0) {
                pos += snprintf(json + pos,
                                sizeof(json) - pos, ",");
            }

            int index = order[i];

            pos += snprintf(json + pos,
                            sizeof(json) - pos,
                            "{\"position\":%d,\"name\":",
                            i + 1);

            appendJsonString(json, sizeof(json),
                             &pos, pages[index]);

            pos += snprintf(json + pos,
                            sizeof(json) - pos,
                            ",\"score\":%.8f}",
                            rankScore[index]);
        }

        snprintf(json + pos, sizeof(json) - pos, "]}");

        mg_http_reply(c, 200,
                      "Content-Type: application/json\r\n",
                      "%s", json);

        return;
    }

    /* Website: Search Webpage API */
    if (mg_strcmp(hm->uri, mg_str("/api/search")) == 0) {

        char name[NAME_SIZE] = "";

        if (mg_http_get_var(&hm->body, "pageName",
                            name, sizeof(name)) <= 0 ||
            strlen(name) == 0) {

            mg_http_reply(c, 400,
                          "Content-Type: text/plain\r\n",
                          "Please enter a webpage name");
            return;
        }

        /* Linear Search using strcmp() */
        int found = -1;

        for (int i = 0; i < pageCount; i++) {
            if (strcmp(pages[i], name) == 0) {
                found = i;
                break;
            }
        }

        if (found == -1) {
            mg_http_reply(c, 404,
                          "Content-Type: text/plain\r\n",
                          "Webpage not found");
            return;
        }

        /* Calculate scores if not already calculated */
        if (!pagerankCalculated) {
            calculatePageRank();
        }
        int position = 1;

for (int i = 0; i < pageCount; i++) {

    if (rankScore[i] > rankScore[found] ||
        (rankScore[i] == rankScore[found] && i < found)) {
        position++;
    }
}

        char json[NAME_SIZE * 6 + 100];
        size_t pos = 0;

        pos += snprintf(json + pos, sizeof(json) - pos,
                        "{\"name\":");

        appendJsonString(json, sizeof(json),
                         &pos, pages[found]);

        snprintf(json + pos, sizeof(json) - pos,
         ",\"score\":%.8f,\"position\":%d}",
         rankScore[found], position);

        mg_http_reply(c, 200,
                      "Content-Type: application/json\r\n",
                      "%s", json);

        return;
    }

    /* Website: Dashboard Statistics API */
    if (mg_strcmp(hm->uri, mg_str("/api/stats")) == 0) {

        int totalLinks = 0;

        for (int i = 0; i < pageCount; i++) {
            for (int j = 0; j < pageCount; j++) {
                if (links[i][j] == 1) {
                    totalLinks++;
                }
            }
        }

        const char *status =
            pagerankCalculated ? "Calculated" : "Pending";

        mg_http_reply(c, 200,
                      "Content-Type: application/json\r\n",
                      "{\"totalPages\":%d,"
                      "\"totalLinks\":%d,"
                      "\"rankingStatus\":\"%s\"}",
                      pageCount, totalLinks, status);

        return;
    }

    /* Serve the website files */
    struct mg_http_serve_opts opts = {
        .root_dir = "./frontend"
    };

    mg_http_serve_dir(c, hm, &opts);
}

int main(void) {

    struct mg_mgr mgr;
    mg_mgr_init(&mgr);

    /* Load previously saved webpages */
    loadData();

    const char *port = getenv("PORT");
char address[64];

if (port == NULL) {
    port = "8000";
}

snprintf(address, sizeof(address), "http://0.0.0.0:%s", port);

mg_http_listen(&mgr, address, webHandler, NULL);

    printf("WebRank Website Started!\n");
    printf("Open http://localhost:8000\n");

    for (;;) {
        mg_mgr_poll(&mgr, 1000);
    }

    mg_mgr_free(&mgr);
    return 0;
}
