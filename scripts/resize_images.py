from PIL import Image
import os

def resize_images(input_folder, output_folder, target_width=1152, target_height=1080):
    # 목표 비율 계산
    target_ratio = target_width / target_height
    
    # 출력 폴더가 없으면 생성
    if not os.path.exists(output_folder):
        os.makedirs(output_folder)
    
    # 입력 폴더의 모든 이미지 처리
    for filename in os.listdir(input_folder):
        if filename.lower().endswith(('.png', '.jpg', '.jpeg')):
            print(f"처리 중: {filename}")
            img_path = os.path.join(input_folder, filename)
            img = Image.open(img_path)
            
            # 원본 비율 계산
            original_ratio = img.width / img.height
            
            # 비율 맞추기: 패딩 추가
            if original_ratio > target_ratio:
                # 좌우 여백 추가 (세로가 상대적으로 작음)
                new_height = int(img.width / target_ratio)
                new_img = Image.new("RGB", (img.width, new_height), (255, 255, 255))
                offset = (new_height - img.height) // 2
                new_img.paste(img, (0, offset))
            elif original_ratio < target_ratio:
                # 상하 여백 추가 (가로가 상대적으로 작음)
                new_width = int(img.height * target_ratio)
                new_img = Image.new("RGB", (new_width, img.height), (255, 255, 255))
                offset = (new_width - img.width) // 2
                new_img.paste(img, (offset, 0))
            else:
                new_img = img
            
            # 최종 리사이즈 (고품질 LANCZOS 필터 사용)
            resized = new_img.resize((target_width, target_height), Image.LANCZOS)
            
            # 저장
            output_path = os.path.join(output_folder, filename)
            resized.save(output_path, quality=95)
            print(f"완료: {filename}")

if __name__ == "__main__":
    # 현재 스크립트의 위치를 기준으로 경로 설정
    current_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(current_dir)
    
    # 입력/출력 폴더 경로 설정
    input_folder = os.path.join(project_root, "public", "images", "original")
    output_folder = os.path.join(project_root, "public", "images")
    
    print("이미지 리사이징 시작...")
    resize_images(input_folder, output_folder)
    print("모든 이미지 처리 완료!") 