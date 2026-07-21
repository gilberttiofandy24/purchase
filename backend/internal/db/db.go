package db

import (
	"log"
	"os"

	"purchase-tracker/internal/auth"
	"purchase-tracker/internal/models"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func Connect() *gorm.DB {
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		dsn = "host=localhost user=postgres password=postgres dbname=purchase_tracker port=5432 sslmode=disable"
	}

	database, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatalf("failed to connect to database: %v", err)
	}

	if err := database.AutoMigrate(
		&models.User{},
		&models.Store{},
		&models.Supplier{},
		&models.PurchaseEntry{},
		&models.GrossSalesEntry{},
		&models.WeeklyNetSales{},
		&models.WeeklyLabourRate{},
		&models.Employee{},
		&models.LabourHourEntry{},
	); err != nil {
		log.Fatalf("failed to migrate database: %v", err)
	}

	seedDefaultAdmin(database)

	return database
}

func seedDefaultAdmin(database *gorm.DB) {
	username := os.Getenv("DEFAULT_ADMIN_USERNAME")
	if username == "" {
		username = "admin"
	}
	password := os.Getenv("DEFAULT_ADMIN_PASSWORD")
	if password == "" {
		password = "admin123"
	}

	var count int64
	database.Model(&models.User{}).Count(&count)
	if count > 0 {
		return
	}

	hash, err := auth.HashPassword(password)
	if err != nil {
		log.Fatalf("failed to hash default admin password: %v", err)
	}

	if err := database.Create(&models.User{Username: username, PasswordHash: hash}).Error; err != nil {
		log.Fatalf("failed to seed default admin: %v", err)
	}

	log.Printf("seeded default admin user %q — change the password after first login", username)
}
