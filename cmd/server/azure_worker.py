import sys
import json
import argparse
import logging
import azure.cognitiveservices.speech as speechsdk

# Logging auf stderr, damit JSON auf stdout sauber bleibt
logging.basicConfig(stream=sys.stderr, level=logging.INFO)

def run(key, region):
    logging.info(f"Starting Azure Python Worker (Region: {region})")

    speech_config = speechsdk.SpeechConfig(subscription=key, region=region)
    speech_config.speech_recognition_language = "de-CH"

    speech_config.set_property(
        property_id=speechsdk.PropertyId.SpeechServiceResponse_DiarizeIntermediateResults,
        value='true'
    )

    # PushStream statt Datei: Wir empfangen Audio via Pipe (stdin)
    stream = speechsdk.audio.PushAudioInputStream()
    audio_config = speechsdk.audio.AudioConfig(stream=stream)

    # ConversationTranscriber initialisieren
    transcriber = speechsdk.transcription.ConversationTranscriber(speech_config, audio_config)

    # Callback für finale Ergebnisse (Satz beendet)
    def handle_final_result(evt):
        if evt.result.text:
            # Speaker ID ist hier meist verlässlich (z.B. "Guest-1")
            speaker_id = evt.result.speaker_id if evt.result.speaker_id else "Unknown"
            output = {
                "text": evt.result.text,
                "is_partial": False,
                "speaker": speaker_id
            }
            print(json.dumps(output), flush=True)

    # Callback für Zwischenergebnisse (Wort für Wort live)
    def handle_partial_result(evt):
        if evt.result.text:
            speaker_id = evt.result.speaker_id if evt.result.speaker_id else "Unknown"
            output = {
                "text": evt.result.text,
                "is_partial": True,
                "speaker": speaker_id
            }
            print(json.dumps(output), flush=True)

    # Event Handler verknüpfen
    transcriber.transcribed.connect(handle_final_result)
    transcriber.transcribing.connect(handle_partial_result)

    transcriber.session_started.connect(lambda evt: logging.info('Session started'))
    transcriber.session_stopped.connect(lambda evt: logging.info('Session stopped'))
    transcriber.canceled.connect(lambda evt: logging.error(f'Canceled: {evt}'))

    # Starten (Async, damit wir im Loop Audio schreiben können)
    transcriber.start_transcribing_async()

    # Streaming Loop: Liest Rohdaten von Go (via Stdin) und schiebt sie zu Azure
    try:
        while True:
            # Lese 4096 Byte Chunks
            chunk = sys.stdin.buffer.read(4096)
            if not chunk:
                break # EOF (Go hat den Stream geschlossen)
            stream.write(chunk)

    except KeyboardInterrupt:
        pass
    except Exception as e:
        logging.error(f"Error in worker loop: {e}")
    finally:
        # Sauber runterfahren
        stream.close()
        transcriber.stop_transcribing_async()
        logging.info("Azure Python Worker stopped")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--key", required=True)
    parser.add_argument("--region", required=True)
    args = parser.parse_args()

    run(args.key, args.region)