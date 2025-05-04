<?php
// api.php - Enhanced with title, description, tags

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}

$servername = "localhost";
$username = "root";
$password = "";
$dbname = "money_tracker";

$conn = new mysqli($servername, $username, $password, $dbname);

if ($conn->connect_error) {
    http_response_code(500);
    die(json_encode(["status" => "error", "message" => "Database connection failed: " . $conn->connect_error]));
}

$method = $_SERVER['REQUEST_METHOD'];
$data = json_decode(file_get_contents("php://input"), true);

// --- Request Handling ---

try {
    switch ($method) {
        case "POST":
            handlePost($conn, $data);
            break;
        case "GET":
            handleGet($conn, $_GET);
            break;
        case "PUT":
            handlePut($conn, $data);
            break;
        case "DELETE":
            handleDelete($conn, $_GET);
            break;
        default:
            http_response_code(405);
            echo json_encode(["status" => "error", "message" => "Method not allowed"]);
            break;
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "An internal error occurred: " . $e->getMessage()]);
}

$conn->close();

// --- Handler Functions ---

function handlePost($conn, $data) {
    if (isset($data["action"])) {
        switch ($data["action"]) {
            case "register":
                registerUser($conn, $data);
                break;
            case "login":
                loginUser($conn, $data);
                break;
            case "add_transaction":
                addTransaction($conn, $data);
                break;
            default:
                http_response_code(400);
                echo json_encode(["status" => "error", "message" => "Invalid POST action"]);
                break;
        }
    } else {
         // Fallback for older client structure if needed, but prefer action parameter
         if (isset($data["register"]) && isset($data["username"]) && isset($data["password"])) {
            registerUser($conn, $data);
         } elseif (isset($data["username"]) && isset($data["password"])) {
             loginUser($conn, $data);
         } elseif (isset($data["user_id"]) && isset($data["type"]) && isset($data["amount"])) {
             addTransaction($conn, $data);
         } else {
            http_response_code(400);
            echo json_encode(["status" => "error", "message" => "Missing parameters for POST request"]);
         }
    }
}

function handleGet($conn, $params) {
    if (isset($params["user_id"])) {
        fetchTransactions($conn, (int)$params["user_id"]);
    } else {
        http_response_code(400);
        echo json_encode(["status" => "error", "message" => "Missing user_id parameter for GET request"]);
    }
}

function handlePut($conn, $data) {
     if (isset($data["user_id"], $data["transaction_id"], $data["type"], $data["amount"])) {
        updateTransaction($conn, $data);
    } else {
        http_response_code(400);
        echo json_encode(["status" => "error", "message" => "Missing parameters for PUT request (update)"]);
    }
}

function handleDelete($conn, $params) {
    // Expecting user_id for verification and transaction_id for deletion
    // Example URL: /api.php?user_id=1&transaction_id=5
     if (isset($params["user_id"], $params["transaction_id"])) {
        deleteTransaction($conn, (int)$params["user_id"], (int)$params["transaction_id"]);
    } else {
        http_response_code(400);
        echo json_encode(["status" => "error", "message" => "Missing user_id or transaction_id parameter for DELETE request"]);
    }
}


// --- Action Functions ---

function registerUser($conn, $data) {
    if (empty($data["username"]) || empty($data["password"])) {
        http_response_code(400);
        echo json_encode(["status" => "error", "message" => "Username and password required"]);
        return;
    }
    $username = $data["username"];
    $password = password_hash($data["password"], PASSWORD_BCRYPT);

    $stmt = $conn->prepare("INSERT INTO users (username, password) VALUES (?, ?)");
    if (!$stmt) {
        throw new Exception("Prepare failed: (" . $conn->errno . ") " . $conn->error);
    }
    $stmt->bind_param("ss", $username, $password);

    if ($stmt->execute()) {
        echo json_encode(["status" => "success", "message" => "Registration successful"]);
    } else {
        // Check for duplicate username error (MySQL error code 1062)
        if ($conn->errno == 1062) {
             http_response_code(409); // Conflict
             echo json_encode(["status" => "error", "message" => "Username already exists"]);
        } else {
             http_response_code(500);
             echo json_encode(["status" => "error", "message" => "Registration failed: " . $stmt->error]);
        }
    }
    $stmt->close();
}

function loginUser($conn, $data) {
     if (empty($data["username"]) || empty($data["password"])) {
        http_response_code(400);
        echo json_encode(["status" => "error", "message" => "Username and password required"]);
        return;
    }
    $username = $data["username"];
    $password_input = $data["password"];

    $stmt = $conn->prepare("SELECT id, password FROM users WHERE username = ?");
     if (!$stmt) {
        throw new Exception("Prepare failed: (" . $conn->errno . ") " . $conn->error);
    }
    $stmt->bind_param("s", $username);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows > 0) {
        $user = $result->fetch_assoc();
        if (password_verify($password_input, $user["password"])) {
            echo json_encode(["status" => "success", "user_id" => $user["id"]]);
        } else {
            http_response_code(401); // Unauthorized
            echo json_encode(["status" => "error", "message" => "Invalid credentials"]);
        }
    } else {
        http_response_code(404); // Not Found
        echo json_encode(["status" => "error", "message" => "User not found"]);
    }
    $stmt->close();
}

function addTransaction($conn, $data) {
    // Basic validation (keep existing)
    if (!isset($data["user_id"]) || !isset($data["type"]) || !isset($data["amount"]) || !in_array($data["type"], ['income', 'expense']) || !is_numeric($data["amount"])) {
       http_response_code(400);
       echo json_encode(["status" => "error", "message" => "Invalid core transaction data"]);
       return;
   }
   if ((int)$data["amount"] <= 0) {
       http_response_code(400);
       echo json_encode(["status" => "error", "message" => "Amount must be positive"]);
       return;
   }

    $user_id = (int)$data["user_id"];
    $type = $data["type"];
    $amount = (int)$data["amount"];

    // Get optional fields (use null coalescing operator ?? for safety)
    $title = isset($data['title']) && !empty(trim($data['title'])) ? trim($data['title']) : null;
    $description = isset($data['description']) && !empty(trim($data['description'])) ? trim($data['description']) : null;
    $tags = isset($data['tags']) && !empty(trim($data['tags'])) ? trim($data['tags']) : null;

    // Note: Adjust max lengths if needed based on DB schema
    if ($title !== null && strlen($title) > 100) $title = substr($title, 0, 100);
    // No length check needed for TEXT description by default
    if ($tags !== null && strlen($tags) > 255) $tags = substr($tags, 0, 255);


    $stmt = $conn->prepare("INSERT INTO transactions (user_id, type, amount, title, description, tags) VALUES (?, ?, ?, ?, ?, ?)");
    if (!$stmt) {
       throw new Exception("Prepare failed (INSERT): (" . $conn->errno . ") " . $conn->error);
    }
    // Bind parameters: integer, string, integer, string, string, string
    $stmt->bind_param("isssss", $user_id, $type, $amount, $title, $description, $tags);

    if ($stmt->execute()) {
        $new_id = $stmt->insert_id;
        // Return the full transaction data including the new ID and fields
        echo json_encode([
            "status" => "success",
            "message" => "Transaction added",
            "transaction" => [
                "id" => $new_id,
                "user_id" => $user_id,
                "type" => $type,
                "amount" => $amount,
                "title" => $title,
                "description" => $description,
                "tags" => $tags
                // Optionally add created_at if needed by frontend immediately
            ]
        ]);
    } else {
        http_response_code(500);
        echo json_encode(["status" => "error", "message" => "Failed to add transaction: " . $stmt->error]);
    }
    $stmt->close();
}

function fetchTransactions($conn, $user_id) {
    // Select the new columns and order by creation date (newest first)
    $stmt = $conn->prepare("SELECT id, type, amount, title, description, tags, created_at FROM transactions WHERE user_id = ? ORDER BY created_at DESC, id DESC");
    if (!$stmt) {
       throw new Exception("Prepare failed (SELECT): (" . $conn->errno . ") " . $conn->error);
    }
    $stmt->bind_param("i", $user_id);
    $stmt->execute();
    $result = $stmt->get_result();
    $transactions = [];
    while ($row = $result->fetch_assoc()) {
        $row['amount'] = (int)$row['amount']; // Ensure amount is integer
        // Ensure optional fields are included, even if null
        $row['title'] = $row['title'] ?? null;
        $row['description'] = $row['description'] ?? null;
        $row['tags'] = $row['tags'] ?? null;
        $transactions[] = $row;
    }
    echo json_encode($transactions);
    $stmt->close();
}

function updateTransaction($conn, $data) {
     // Basic validation (keep existing)
    if (!isset($data["user_id"], $data["transaction_id"], $data["type"], $data["amount"]) || !in_array($data["type"], ['income', 'expense']) || !is_numeric($data["amount"])) {
        http_response_code(400);
        echo json_encode(["status" => "error", "message" => "Invalid core transaction data for update"]);
        return;
    }
     if ((int)$data["amount"] <= 0) {
        http_response_code(400);
        echo json_encode(["status" => "error", "message" => "Amount must be positive"]);
        return;
    }

    $user_id = (int)$data["user_id"];
    $transaction_id = (int)$data["transaction_id"];
    $type = $data["type"];
    $amount = (int)$data["amount"];

    // Get optional fields
    $title = isset($data['title']) && !empty(trim($data['title'])) ? trim($data['title']) : null;
    $description = isset($data['description']) && !empty(trim($data['description'])) ? trim($data['description']) : null;
    $tags = isset($data['tags']) && !empty(trim($data['tags'])) ? trim($data['tags']) : null;

    // Optional: Length validation/truncation
    if ($title !== null && strlen($title) > 100) $title = substr($title, 0, 100);
    if ($tags !== null && strlen($tags) > 255) $tags = substr($tags, 0, 255);

    $stmt = $conn->prepare("UPDATE transactions SET type = ?, amount = ?, title = ?, description = ?, tags = ? WHERE id = ? AND user_id = ?");
     if (!$stmt) {
        throw new Exception("Prepare failed (UPDATE): (" . $conn->errno . ") " . $conn->error);
    }
    // Bind parameters: string, integer, string, string, string, integer (id), integer (user_id)
    $stmt->bind_param("sisssii", $type, $amount, $title, $description, $tags, $transaction_id, $user_id);

    if ($stmt->execute()) {
        if ($stmt->affected_rows > 0) {
             // Optionally fetch and return the updated record or just success
             echo json_encode([
                "status" => "success",
                "message" => "Transaction updated",
                // Optionally return updated data if needed by frontend immediately
                "transaction" => [
                    "id" => $transaction_id,
                    "user_id" => $user_id,
                    "type" => $type,
                    "amount" => $amount,
                    "title" => $title,
                    "description" => $description,
                    "tags" => $tags
                ]
            ]);
        } else {
            // Check if the transaction exists at all for this user
            $checkStmt = $conn->prepare("SELECT id FROM transactions WHERE id = ? AND user_id = ?");
            $checkStmt->bind_param("ii", $transaction_id, $user_id);
            $checkStmt->execute();
            $checkResult = $checkStmt->get_result();
            if ($checkResult->num_rows == 0) {
                 http_response_code(404);
                 echo json_encode(["status" => "error", "message" => "Transaction not found or not owned by user"]);
            } else {
                 // Row exists but wasn't changed (maybe submitted same data)
                 echo json_encode(["status" => "success", "message" => "Transaction data unchanged"]);
            }
            $checkStmt->close();
        }
    } else {
        http_response_code(500);
        echo json_encode(["status" => "error", "message" => "Failed to update transaction: " . $stmt->error]);
    }
    $stmt->close();
}

function deleteTransaction($conn, $user_id, $transaction_id) {
    $stmt = $conn->prepare("DELETE FROM transactions WHERE id = ? AND user_id = ?");
     if (!$stmt) {
        throw new Exception("Prepare failed (DELETE): (" . $conn->errno . ") " . $conn->error);
    }
    $stmt->bind_param("ii", $transaction_id, $user_id);

    if ($stmt->execute()) {
         if ($stmt->affected_rows > 0) {
            echo json_encode(["status" => "success", "message" => "Transaction deleted"]);
        } else {
            http_response_code(404);
            echo json_encode(["status" => "error", "message" => "Transaction not found or not owned by user"]);
        }
    } else {
        http_response_code(500);
        echo json_encode(["status" => "error", "message" => "Failed to delete transaction: " . $stmt->error]);
    }
    $stmt->close();
}

?>