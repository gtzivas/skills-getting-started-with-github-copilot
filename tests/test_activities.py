def test_get_activities_returns_all_activities_with_expected_shape(client):
    # Arrange
    expected_fields = {"description", "schedule", "max_participants", "participants"}

    # Act
    response = client.get("/activities")
    payload = response.json()

    # Assert
    assert response.status_code == 200
    assert isinstance(payload, dict)
    assert len(payload) == 9

    for activity_name, activity_data in payload.items():
        assert activity_name
        assert expected_fields.issubset(activity_data.keys())
        assert isinstance(activity_data["participants"], list)


def test_root_redirects_to_static_index(client):
    # Arrange
    root_path = "/"

    # Act
    response = client.get(root_path, follow_redirects=False)

    # Assert
    assert response.status_code in (302, 307)
    assert response.headers["location"] == "/static/index.html"
