package main

import (
	"log"
	"os"
	"strings"

	"purchase-tracker/internal/auth"
	"purchase-tracker/internal/db"
	"purchase-tracker/internal/handlers"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

func main() {
	_ = godotenv.Load()

	database := db.Connect()

	engine := gin.Default()

	allowOrigins := []string{"http://localhost:3000"}
	if v := os.Getenv("ALLOW_ORIGINS"); v != "" {
		allowOrigins = strings.Split(v, ",")
	}

	engine.Use(cors.New(cors.Config{
		AllowOrigins:     allowOrigins,
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization"},
		AllowCredentials: true,
	}))

	authHandler := auth.NewHandler(database)
	storeHandler := handlers.NewStoreHandler(database)
	supplierHandler := handlers.NewSupplierHandler(database)
	employeeHandler := handlers.NewEmployeeHandler(database)
	purchaseHandler := handlers.NewPurchaseHandler(database)

	api := engine.Group("/api")
	auth.RegisterRoutes(api, authHandler)

	protected := api.Group("")
	protected.Use(auth.Middleware())
	{
		handlers.RegisterStoreRoutes(protected, storeHandler)
		handlers.RegisterSupplierRoutes(protected, supplierHandler)
		handlers.RegisterEmployeeRoutes(protected, employeeHandler)
		handlers.RegisterPurchaseRoutes(protected, purchaseHandler)
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("listening on :%s", port)
	if err := engine.Run(":" + port); err != nil {
		log.Fatal(err)
	}
}
