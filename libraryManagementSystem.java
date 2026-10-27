import java.util.ArrayList;
import java.util.Scanner;

class LibraryItem {
  private String title;
  private boolean isAvailable;

  public LibraryItem(String title) {
    this.title = title;
    this.isAvailable = true;
  }

  public String getTitle() {
    return title;
  }

  public boolean isAvailable() {
    return isAvailable;
  }

  public void borrowItem() {
    if (isAvailable) {
      isAvailable = false;
      System.out.println(title + " has been borrowed.");
    } else {
      System.out.println(title + " is currently not available.");
    }
  }

  public void returnItem() {
    if (!isAvailable) {
      isAvailable = true;
      System.out.println(title + " has been returned.");
    } else {
      System.out.println(title + " was not borrowed.");
    }
  }
}

class Book extends LibraryItem {
  private String author;

  public Book(String title, String author) {
    super(title);
    this.author = author;
  }

  public String getAuthor() {
    return author;
  }
}

class Vinyl extends LibraryItem {
  private String artist;

  public Vinyl(String title, String artist) {
    super(title);
    this.artist = artist;
  }

  public String getArtist() {
    return artist;
  }
}

class Movie extends LibraryItem {
  private String director;

  public Movie(String title, String director) {
    super(title);
    this.director = director;
  }

  public String getDirector() {
    return director;
  }
}

public class Main {
  private static ArrayList<Book> books = new ArrayList<>();
  private static ArrayList<Vinyl> vinyls = new ArrayList<>();
  private static ArrayList<Movie> movies = new ArrayList<>();

  public static void main(String[] args) {
    Scanner scanner = new Scanner(System.in);
    books.add(new Book("The Fault in Our Stars", "John Green"));
    books.add(new Book("A Good Book", "Author Name"));
    vinyls.add(new Vinyl("Abbey Road", "The Beatles"));
    vinyls.add(new Vinyl("Dark Side of the Moon", "Pink Floyd"));
    movies.add(new Movie("Inception", "Christopher Nolan"));
    movies.add(new Movie("The Matrix", "The Wachowskis"));

    while (true) {
      showOptions();
      String command = scanner.nextLine();
      if (command.equals("exit")) {
        break;
      }
      handleCommand(command, scanner);
    }
    scanner.close();
  }

  private static void showOptions() {
    System.out.println("Enter command (borrow, return, donate, show, exit):");
  }

  private static void handleCommand(String command, Scanner scanner) {
    switch (command) {
      case "borrow":
      case "return":
      case "donate":
        System.out.println("Enter item type (book, vinyl, movie):");
        String itemType = scanner.nextLine();
        System.out.println("Enter title:");
        String title = scanner.nextLine();
        if (command.equals("borrow")) {
          borrowItem(itemType, title);
        } else if (command.equals("return")) {
          returnItem(itemType, title);
        } else {
          donateItem(itemType, title, scanner);
        }
        break;
      case "show":
        showItems();
        break;
      default:
        System.out.println("Invalid command.");
    }
  }

  private static void borrowItem(String itemType, String title) {
    switch (itemType) {
      case "book":
        for (Book book : books) {
          if (book.getTitle().equalsIgnoreCase(title)) {
            book.borrowItem();
            return;
          }
        }
        break;
      case "vinyl":
        for (Vinyl vinyl : vinyls) {
          if (vinyl.getTitle().equalsIgnoreCase(title)) {
            vinyl.borrowItem();
            return;
          }
        }
        break;
      case "movie":
        for (Movie movie : movies) {
          if (movie.getTitle().equalsIgnoreCase(title)) {
            movie.borrowItem();
            return;
          }
        }
        break;
      default:
        System.out.println("Invalid item type.");
        return;
    }
    System.out.println("Item not found.");
  }

  private static void returnItem(String itemType, String title) {
    switch (itemType) {
      case "book":
        for (Book book : books) {
          if (book.getTitle().equalsIgnoreCase(title)) {
            book.returnItem();
            return;
          }
        }
        break;
      case "vinyl":
        for (Vinyl vinyl : vinyls) {
          if (vinyl.getTitle().equalsIgnoreCase(title)) {
            vinyl.returnItem();
            return;
          }
        }
        break;
      case "movie":
        for (Movie movie : movies) {
          if (movie.getTitle().equalsIgnoreCase(title)) {
            movie.returnItem();
            return;
          }
        }
        break;
      default:
        System.out.println("Invalid item type.");
        return;
    }
    System.out.println("Item not found.");
  }

  private static void donateItem(String itemType, String title, Scanner scanner) {
    switch (itemType) {
      case "book":
        System.out.println("Enter author:");
        String author = scanner.nextLine();
        books.add(new Book(title, author));
        System.out.println(title + " by " + author + " has been donated to the library.");
        break;
      case "vinyl":
        System.out.println("Enter artist:");
        String artist = scanner.nextLine();
        vinyls.add(new Vinyl(title, artist));
        System.out.println(title + " by " + artist + " has been donated to the library.");
        break;
      case "movie":
        System.out.println("Enter director:");
        String director = scanner.nextLine();
        movies.add(new Movie(title, director));
        System.out.println(title + " directed by " + director + " has been donated to the library.");
        break;
      default:
        System.out.println("Invalid item type.");
    }
  }

  private static void showItems() {
    System.out.println("Books:");
    for (Book book : books) {
      System.out.println(book.getTitle() + " by " + book.getAuthor() + (book.isAvailable() ? " (Available)" : " (Borrowed)"));
    }
    System.out.println("Vinyls:");
    for (Vinyl vinyl : vinyls) {
      System.out.println(vinyl.getTitle() + " by " + vinyl.getArtist() + (vinyl.isAvailable() ? " (Available)" : " (Borrowed)"));
    }
    System.out.println("Movies:");
    for (Movie movie : movies) {
      System.out.println(movie.getTitle() + " directed by " + movie.getDirector() + (movie.isAvailable() ? " (Available)" : " (Borrowed)"));
    }
  }
}
