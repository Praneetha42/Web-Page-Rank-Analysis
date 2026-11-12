#include <stdio.h>
#include <string.h>

#define MAX_PAGES 100
#define NAME_SIZE 100

char pages[MAX_PAGES][NAME_SIZE];
int links[MAX_PAGES][MAX_PAGES];
int pageCount = 0;
double rankScore[MAX_PAGES];
int pagerankCalculated = 0;
void saveData();
void addWebPage()
{
    if (pageCount >= MAX_PAGES)
    {
        printf("Maximum pages reached!\n");
        return;
    }

    printf("Enter Web Page Name: ");
    scanf(" %99[^\n]", pages[pageCount]);
    for (int i = 0; i < pageCount; i++)
{
    if (strcmp(pages[i], pages[pageCount]) == 0)
    {
        printf("Web Page already exists!\n");
        return;
    }
}
pagerankCalculated = 0;
    pageCount++;
    saveData();

    printf("Web Page aadded successfully!\n");
}

void displayWebPages()
{
    if (pageCount == 0)
    {
        printf("No web pages added yet.\n");
        return;
    }

    printf("\n--- Web Pages ---\n");

    for (int i = 0; i < pageCount; i++)
    {
        printf("%d. %s\n", i + 1, pages[i]);
    }
}

void addLink()
{
    int source, destination;

    if (pageCount < 2)
    {
        printf("Add at least 2 web pages first!\n");
        return;
    }

    displayWebPages();

    printf("\nEnter source page number: ");
    scanf("%d", &source);

    printf("Enter destination page number: ");
    scanf("%d", &destination);

    if (source < 1 || source > pageCount ||
        destination < 1 || destination > pageCount)
    {
        printf("Invalid page number!\n");
        return;
    }

    if (links[source - 1][destination - 1] == 1)
    {
    printf("Link already exists!\n");
    return;
    }
    links[source - 1][destination - 1] = 1;
    pagerankCalculated = 0;

    saveData();

    printf("Link added successfully!\n");
}

void saveData()
{
    FILE *fp = fopen("website_data.txt", "w");

    if (fp == NULL)
    {
        printf("Error saving data!\n");
        return;
    }

    fprintf(fp, "%d\n", pageCount);

    for (int i = 0; i < pageCount; i++)
    {
        fprintf(fp, "%s\n", pages[i]);
    }

    for (int i = 0; i < pageCount; i++)
    {
        for (int j = 0; j < pageCount; j++)
        {
            fprintf(fp, "%d ", links[i][j]);
        }
        fprintf(fp, "\n");
    }

    fclose(fp);

    printf("Data saved successfully!\n");
}

void loadData()
{
    FILE *fp = fopen("website_data.txt", "r");

    if (fp == NULL)
    {
        printf("No saved data found.\n");
        return;
    }

    fscanf(fp, "%d", &pageCount);

    if (pageCount < 0 || pageCount > MAX_PAGES)
    {
        pageCount = 0;
        fclose(fp);
        printf("Invalid saved data!\n");
        return;
    }

    fgetc(fp);

    for (int i = 0; i < pageCount; i++)
    {
        fgets(pages[i], NAME_SIZE, fp);
        pages[i][strcspn(pages[i], "\n")] = '\0';
    }

   for (int i = 0; i < pageCount; i++)
   {
    for (int j = 0; j < pageCount; j++)
    {
        if (fscanf(fp, "%d", &links[i][j]) != 1 ||
            (links[i][j] != 0 && links[i][j] != 1))
        {
            printf("Invalid link data!\n");
            pageCount = 0;
            fclose(fp);
            return;
        }
    }
 }

    fclose(fp);

    pagerankCalculated = 0;

    printf("Saved data loaded successfully!\n");
}


void displayLinks()
{
    printf("\n--- Link Structure ---\n");

    for (int i = 0; i < pageCount; i++)
    {
        for (int j = 0; j < pageCount; j++)
        {
            if (links[i][j] == 1)
            {
                printf("%s --> %s\n", pages[i], pages[j]);
            }
        }
    }
}

void searchWebPage()
{
    char searchName[NAME_SIZE];
    int found = 0;

    printf("Enter Web Page Name to Search: ");
    scanf(" %99[^\n]", searchName);

    for (int i = 0; i < pageCount; i++)
    {
        if (strcmp(pages[i], searchName) == 0)
        {
            printf("\nWeb Page Found!\n");
            printf("Page Name: %s\n", pages[i]);
            printf("Page Rank: %.4f\n", rankScore[i]);

            found = 1;
            break;
        }
    }

    if (found == 0)
    {
        printf("\nWeb Page Not Found!\n");
    }
}

void sortPageRank()
{
    int i, j;

    char sortedPages[MAX_PAGES][NAME_SIZE];
    double sortedRanks[MAX_PAGES];
    if (pagerankCalculated == 0)
{
    printf("Calculate PageRank first!\n");
    return;
}

    if (pageCount == 0)
    {
        printf("Add web pages first!\n");
        return;
    }

    // Copy original pages and ranks
    for (i = 0; i < pageCount; i++)
    {
        strcpy(sortedPages[i], pages[i]);
        sortedRanks[i] = rankScore[i];
    }

    // Bubble Sort using temporary arrays
    for (i = 0; i < pageCount - 1; i++)
    {
        for (j = 0; j < pageCount - i - 1; j++)
        {
            if (sortedRanks[j] < sortedRanks[j + 1])
            {
                double tempRank;
                char tempName[NAME_SIZE];

                tempRank = sortedRanks[j];
                sortedRanks[j] = sortedRanks[j + 1];
                sortedRanks[j + 1] = tempRank;

                strcpy(tempName, sortedPages[j]);
                strcpy(sortedPages[j], sortedPages[j + 1]);
                strcpy(sortedPages[j + 1], tempName);
            }
        }
    }

    printf("\n--- Page Ranking (Highest First) ---\n");

    for (i = 0; i < pageCount; i++)
    {
        printf("%d. %s : %.4f\n",
               i + 1, sortedPages[i], sortedRanks[i]);
    }
}


void calculatePageRank()
{
    if (pageCount == 0)
    {
        printf("Add web pages first!\n");
        return;
    }

    double newRank[MAX_PAGES];
    double damping = 0.85;

    // Initially all pages have equal rank
    for (int i = 0; i < pageCount; i++)
    {
        rankScore[i] = 1.0 / pageCount;
    }

    // Repeat PageRank calculation 20 times
    for (int iteration = 0; iteration < 20; iteration++)
    {
        for (int i = 0; i < pageCount; i++)
        {
            newRank[i] = (1.0 - damping) / pageCount;
        }

        for (int j = 0; j < pageCount; j++)
        {
            int outLinks = 0;

            for (int k = 0; k < pageCount; k++)
            {
                if (links[j][k] == 1)
                {
                    outLinks++;
                }
            }

            if (outLinks > 0)
            {
                for (int i = 0; i < pageCount; i++)
                {
                    if (links[j][i] == 1)
                    {
                        newRank[i] += damping *
                                      rankScore[j] /
                                      outLinks;
                    }
                }
            }
            else
            {
                for (int i = 0; i < pageCount; i++)
                {
                    newRank[i] += damping *
                                  rankScore[j] /
                                  pageCount;
                }
            }
        }

        for (int i = 0; i < pageCount; i++)
        {
            rankScore[i] = newRank[i];
        }
    }

    printf("PageRank calculated successfully!\n");
    pagerankCalculated = 1;
}


int main()
{
    int choice;

    loadData();
    do
    {
        printf("\n============================================\n");
        printf(" WEB PAGE RANKING AND LINK ANALYSIS SYSTEM\n");
        printf("============================================\n");

        printf("1. Add Web Page\n");
        printf("2. Add Link Between Pages\n");
        printf("3. Display All Web Pages\n");
        printf("4. Display Link Structure\n");
        printf("5. Calculate PageRank\n");
        printf("6. Display Page Ranking\n");
        printf("7. Search Web Page\n");
        printf("8. Exit\n");

        printf("\nEnter your choice: ");
        scanf("%d", &choice);

        switch(choice)
        {
            case 1:
                addWebPage();
                break;

            case 2:
                addLink();
                break;

            case 3:
                displayWebPages();
                break;

            case 4:
                displayLinks();
                break;
                case 5:
    calculatePageRank();
    break;

    case 6:
    sortPageRank();
    break;
    case 7:
    searchWebPage();
    break;

    case 8:
    printf("Thank you for using Web Page Ranking System!\n");
    printf("Your data is saved safely.\n");
    break;

    default:
    printf("Invalid choice! Please enter 1 to 8.\n");
        }

    } while(choice != 8);

    return 0;
}