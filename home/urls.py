
from django.urls import path
from . import views

urlpatterns = [
    path("", views.home, name="home"),
    path("contact/send/", views.send_contact_email, name="contact"),
]
