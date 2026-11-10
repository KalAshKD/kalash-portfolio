
from django.shortcuts import render
from django.conf import settings
from django.core.mail import EmailMessage
from django.core.validators import validate_email
from django.core.exceptions import ValidationError
from django.http import JsonResponse
from django.views.decorators.http import require_POST


def home(request):
    return render(request, "home/index.html")


@require_POST
def send_contact_email(request):
    name = request.POST.get("name", "").strip()
    visitor_email = request.POST.get("email", "").strip()
    topic = request.POST.get("topic", "").strip()
    message = request.POST.get("message", "").strip()

    allowed_topics = {
        "freelance": "Freelance work",
        "hiring": "Hire / Job opportunity",
        "collab": "Collaboration",
        "tech": "Tech & ideas",
        "network": "Networking",
        "other": "Something else",
    }

    if not all([name, visitor_email, topic, message]):
        return JsonResponse(
            {"error": "Please fill in all fields."},
            status=400
        )

    if topic not in allowed_topics:
        return JsonResponse(
            {"error": "Please select a valid topic."},
            status=400
        )

    if len(name) > 100 or len(message) > 5000:
        return JsonResponse(
            {"error": "Your name or message is too long."},
            status=400
        )

    try:
        validate_email(visitor_email)
    except ValidationError:
        return JsonResponse(
            {"error": "Please enter a valid email address."},
            status=400
        )

    subject = f"Portfolio Contact - {allowed_topics[topic]}"

    body = (
        f"New message from your portfolio website.\n\n"
        f"Name: {name}\n"
        f"Email: {visitor_email}\n"
        f"Topic: {allowed_topics[topic]}\n\n"
        f"Message:\n{message}"
    )

    try:
        email = EmailMessage(
            subject=subject,
            body=body,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[settings.EMAIL_HOST_USER],
            reply_to=[visitor_email],
        )
        email.send(fail_silently=False)

        return JsonResponse({
            "success": True,
            "message": "Your message has been sent successfully!"
        })

    except Exception:
        return JsonResponse(
            {"error": "Unable to send your message right now. Please try again."},
            status=500
        )
